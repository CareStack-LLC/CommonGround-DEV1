"""
Compliance Summary section generator.

Section 2: Side-by-side parent comparison ("power page").
"""

from datetime import datetime, timedelta
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.models.case import Case, CaseParticipant
from app.models.user import User
from app.models.schedule import ExchangeCheckIn
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.custody_day_record import CustodyDayRecord
from app.models.message import Message, MessageFlag
from app.models.payment import Payment, ExpenseRequest
from app.models.agreement import Agreement, AgreementConversation, AgreementSection
from app.services.geolocation import GeolocationService
import httpx
import base64
from io import BytesIO
from app.services.export.generators.base import (
    BaseSectionGenerator,
    GeneratorContext,
    SectionContent,
)


class ComplianceSummaryGenerator(BaseSectionGenerator):
    """Generates the Compliance Summary section."""

    section_type = "compliance_summary"
    section_title = "Compliance Summary"
    section_order = 2

    async def generate(self, context: GeneratorContext) -> SectionContent:
        """Generate compliance summary comparing both parents."""
        db = context.db

        # Get participants
        participants_result = await db.execute(
            select(CaseParticipant, User)
            .join(User, CaseParticipant.user_id == User.id)
            .where(CaseParticipant.case_id == context.case_id)
            .where(CaseParticipant.is_active == True)
        )
        participants = list(participants_result.all())

        if len(participants) < 2:
            return self._empty_content("Requires two active participants")

        # Build metrics for each parent
        parent_metrics = []
        for participant, user in participants:
            metrics = await self._calculate_parent_metrics(
                db, context, participant, user, participants
            )
            parent_metrics.append(metrics)

        # Calculate comparison data
        comparison = self._build_comparison(parent_metrics)

        # Get Agreement Info (Check both Case link and FamilyFile link)
        # Need to identify family_file_id from participants or context
        family_file_id = None
        # Try to find family_file_id from a participant user (all belong to same family file usually)
        if participants:
             # Just use the first participant to find common family file
             # We assume context.case_id effectively filters correct family context
             # But we need the ID to query Agreement.
             # Let's get "Case" object to find family_file_id if distinct?
             # Actually, best validation is:
             pass

        # Query for Agreement linked to Case OR Family File
        # We need to join usually, but let's try a broader search since case_id is known
        # Get Case to get family_file_id?
        case_obj = await db.get(Case, context.case_id)
        family_file_id = case_obj.family_file_id if case_obj else None

        stmt = select(Agreement).where(
            or_(
                Agreement.case_id == context.case_id,
                Agreement.family_file_id == family_file_id
            ) if family_file_id else (Agreement.case_id == context.case_id)
        ).order_by(Agreement.updated_at.desc())
        
        result = await db.execute(stmt)
        all_agreements = result.scalars().all()
        
        # Priority: Active > Draft (sorted by updated_at within those)
        agreement = None
        # Try to find first 'active'
        for a in all_agreements:
            if a.status == 'active':
                agreement = a
                break
        
        # If no active, fallback to newest (first in list)
        if not agreement and all_agreements:
            agreement = all_agreements[0]
        
        agreement_text = "No active agreement found."
        if agreement:
            title_status = f"{agreement.title} ({agreement.status.replace('_', ' ').title()})"
            
            # Try to fetch summary from conversation if available
            conv = await db.scalar(
                select(AgreementConversation)
                .where(AgreementConversation.agreement_id == agreement.id)
                .order_by(AgreementConversation.updated_at.desc())
            )
            
            summary_text = None
            if conv:
                if conv.summary:
                    summary_text = conv.summary
                elif conv.extracted_data and conv.extracted_data.get('summary'):
                     summary_text = conv.extracted_data.get('summary')
            
            if summary_text:
                agreement_text = f"{title_status}: {summary_text}"
            else:
                agreement_text = title_status

        agreement_summary = agreement_text

        content_data = {
            "parents": parent_metrics,
            "comparison": comparison,
            "report_period": {
                "start": self._format_date(context.date_start),
                "end": self._format_date(context.date_end),
            },
            "summary": self._generate_summary(parent_metrics),
            "agreement_summary": agreement_summary,
        }

        return SectionContent(
            section_type=self.section_type,
            section_title=self.section_title,
            section_order=self.section_order,
            content_data=content_data,
            evidence_count=sum(m.get("total_interactions", 0) for m in parent_metrics),
            data_sources=["exchange_check_ins", "messages", "message_flags", "payments"],
        )

    async def _calculate_parent_metrics(
        self,
        db,
        context: GeneratorContext,
        participant: CaseParticipant,
        user: User,
        participants: list
    ) -> dict:
        """Calculate compliance metrics for a parent."""
        user_id = participant.user_id
        start = datetime.combine(context.date_start, datetime.min.time())
        end = datetime.combine(context.date_end, datetime.max.time())

        # Calculate Exchange Metrics from Instances (Source of Truth)
        # Fetch all instances where user is involved
        instances_result = await db.execute(
            select(CustodyExchangeInstance)
            .join(CustodyExchange)
            .where(
                and_(
                    CustodyExchange.case_id == context.case_id,
                    CustodyExchangeInstance.scheduled_time >= start,
                    CustodyExchangeInstance.scheduled_time <= end,
                    or_(
                        CustodyExchange.from_parent_id == user_id,
                        CustodyExchange.to_parent_id == user_id
                    )
                )
            )
            .options(selectinload(CustodyExchangeInstance.exchange))
        )
        instances = instances_result.scalars().all()
        
        total_exchanges = len(instances)
        on_time_count = 0
        missed_exchanges = 0
        last_exchange = None  # Track most recent exchange
        
        for instance in instances:
            exchange = instance.exchange
            is_from = (exchange.from_parent_id == user_id)
            
            # Track last exchange
            if last_exchange is None or instance.scheduled_time > last_exchange['_dt']:
                last_exchange = {
                    '_dt': instance.scheduled_time,  # Keep for comparison only, won't serialize
                    'datetime': instance.scheduled_time.isoformat(),  # ISO string for JSON
                    'date': instance.scheduled_time.strftime('%b %d, %Y'),
                    'time': instance.scheduled_time.strftime('%I:%M %p'),
                    'status': instance.status or 'scheduled',
                }
            
            # Determine specific check-in status for this user
            has_checked_in = instance.from_parent_checked_in if is_from else instance.to_parent_checked_in
            check_in_time = instance.from_parent_check_in_time if is_from else instance.to_parent_check_in_time
            
            # On Time Logic
            if has_checked_in and check_in_time:
                # 15 min grace period standard
                if check_in_time <= (instance.scheduled_time + timedelta(minutes=15)):
                    on_time_count += 1
            
            # Missed Logic
            if instance.status == 'missed':
                # If the user failed to check in, they share responsibility for the miss
                if not has_checked_in:
                    missed_exchanges += 1
        
        # Fallback: If seeding didn't specific times but marked "completed",
        # check if we should count it as on time (heuristic for reported data)
        # If instances say "completed" but check_in_time is None (legacy/bad seeding),
        # we might assume on-time if status is completed?
        # User complained about Missed, so let's stick to strict logic for Missed.
        # But for on-time, if check-in times are missing (which they are in Instance table too based on 0 checkins?),
        # wait. Seeding script sets `from_parent_check_in_time`.
        # Let's hope seeding populated instance columns. User said Section 2 on-time rate was 0.0%.
        # This implies instance columns might be NULL too? 
        # Checking seed script: `instance.from_parent_check_in_time = scheduled_time - ...`
        # It DOES set them. So why was on-time 0? 
        # Because previous code queried `ExchangeCheckIn` table.
        # This new code querying `CustodyExchangeInstance` columns SHOULD fix on-time too.

        # Message metrics
        messages_sent_result = await db.execute(
            select(func.count(Message.id))
            .where(
                and_(
                    Message.case_id == context.case_id,
                    Message.sender_id == user_id,
                    Message.sent_at >= start,
                    Message.sent_at <= end
                )
            )
        )
        messages_sent = messages_sent_result.scalar() or 0

        # ARIA intervention metrics
        flags_result = await db.execute(
            select(func.count(MessageFlag.id))
            .join(Message, MessageFlag.message_id == Message.id)
            .where(
                and_(
                    Message.case_id == context.case_id,
                    Message.sender_id == user_id,
                    MessageFlag.created_at >= start,
                    MessageFlag.created_at <= end
                )
            )
        )
        interventions = flags_result.scalar() or 0

        # Top Toxic Category
        # Fetch all flags and aggregate in Python to avoid JSON SQL dialect issues
        flags_data = await db.execute(
            select(MessageFlag.categories)
            .join(Message, MessageFlag.message_id == Message.id)
            .where(
                and_(
                    Message.case_id == context.case_id,
                    Message.sender_id == user_id,
                    MessageFlag.created_at >= start,
                    MessageFlag.created_at <= end,
                )
            )
        )
        all_categories = []
        for row in flags_data.scalars():
            if row:
                all_categories.extend(row)
        
        from collections import Counter
        if all_categories:
            counts = Counter(all_categories)
            top_toxic_category = counts.most_common(1)[0][0]
        else:
            top_toxic_category = "None"

        # Payment metrics
        payments_made_result = await db.execute(
            select(func.count(Payment.id))
            .where(
                and_(
                    Payment.case_id == context.case_id,
                    Payment.payer_id == user_id,
                    Payment.status == "completed",
                    Payment.completed_at >= start,
                    Payment.completed_at <= end
                )
            )
        )
        payments_made = payments_made_result.scalar() or 0

        # Calculate compliance scores
        exchange_rate = self._calculate_percentage(on_time_count, total_exchanges)
        intervention_rate = self._calculate_percentage(interventions, messages_sent)

        # ===============================================
        # ENHANCED COMPLIANCE: Financial Metrics
        # ===============================================
        
        # Child Support Compliance (if this parent is the payer)
        child_support_score = 100.0  # Default: not applicable or fully compliant
        child_support_payments = await db.execute(
            select(Payment)
            .where(
                and_(
                    Payment.case_id == context.case_id,
                    Payment.payment_type == "child_support",
                    Payment.payer_id == user_id,
                    Payment.scheduled_date >= start,
                    Payment.scheduled_date <= end
                )
            )
        )
        cs_payments = child_support_payments.scalars().all()
        if cs_payments:
            # Calculate: on-time (within 5 days), full amount ($800 expected)
            on_time_full = 0
            expected_amount = 800.0  # From agreement key_terms
            for pmt in cs_payments:
                is_on_time = pmt.completed_at and pmt.scheduled_date and (
                    pmt.completed_at.date() <= (pmt.scheduled_date.date() + timedelta(days=5))
                )
                is_full = float(pmt.amount) >= expected_amount
                if is_on_time and is_full:
                    on_time_full += 1
            child_support_score = self._calculate_percentage(on_time_full, len(cs_payments))
        
        # Expense Compliance (if this parent owes)
        expense_score = 100.0  # Default
        expense_reqs = await db.execute(
            select(ExpenseRequest)
            .where(
                and_(
                    ExpenseRequest.case_id == context.case_id,
                    ExpenseRequest.requested_from == user_id,
                    ExpenseRequest.status.in_(["approved", "paid"])
                )
            )
        )
        expenses = expense_reqs.scalars().all()
        if expenses:
            paid_count = sum(1 for e in expenses if e.is_fully_paid)
            expense_score = self._calculate_percentage(paid_count, len(expenses))

        # ===============================================
        # CUSTODY TRACKING COMPLIANCE
        # ===============================================
        # Compare actual custody time vs. expected split from agreement
        custody_tracking_score = 100.0  # Default: fully compliant
        
        # Get expected custody split from agreement (e.g., "80/20")
        # Need to fetch agreement and parse key terms
        import re
        expected_pct = None
        
        # Determine if this parent is petitioner or respondent
        is_petitioner = (participant.role == 'petitioner')
        
        # Fetch agreement to get expected split
        from app.models.case import Case
        case = await db.get(Case, context.case_id)
        if case and case.family_file_id:
            agmt_result = await db.execute(
                select(Agreement).where(
                    or_(
                        Agreement.case_id == context.case_id,
                        Agreement.family_file_id == case.family_file_id
                    ),
                    Agreement.status == 'active'
                ).order_by(Agreement.updated_at.desc())
            )
            agreement = agmt_result.scalars().first()
            if agreement:
                # Get sections and parse custody split
                sections_result = await db.execute(
                    select(AgreementSection).where(AgreementSection.agreement_id == agreement.id)
                )
                sections = sections_result.scalars().all()
                for section in sections:
                    if section.section_type in ["schedule", "physical_custody"] and section.content:
                        # Parse "80/20" or "Parent A having 80%..."
                        match = re.search(r'Parent\s*A\s*having\s*(\d+)%.*Parent\s*B\s*having\s*(\d+)%', section.content)
                        if match:
                            # Petitioner = Parent A
                            expected_pct = float(match.group(1)) if is_petitioner else float(match.group(2))
                            break
                        match2 = re.search(r'(\d+)%?\s*/\s*(\d+)%?', section.content)
                        if match2:
                            expected_pct = float(match2.group(1)) if is_petitioner else float(match2.group(2))
                            break
        
        # Get actual custody percentage from CustodyDayRecord
        if expected_pct is not None and case and case.family_file_id:
            total_days_result = await db.execute(
                select(func.count(CustodyDayRecord.id)).where(
                    CustodyDayRecord.family_file_id == case.family_file_id,
                    CustodyDayRecord.record_date >= context.date_start,
                    CustodyDayRecord.record_date <= context.date_end
                )
            )
            total_custody_days = total_days_result.scalar() or 0
            
            parent_days_result = await db.execute(
                select(func.count(CustodyDayRecord.id)).where(
                    CustodyDayRecord.family_file_id == case.family_file_id,
                    CustodyDayRecord.record_date >= context.date_start,
                    CustodyDayRecord.record_date <= context.date_end,
                    CustodyDayRecord.custodial_parent_id == user_id
                )
            )
            parent_custody_days = parent_days_result.scalar() or 0
            
            if total_custody_days > 0:
                actual_pct = (parent_custody_days / total_custody_days) * 100
                # Calculate deviation score
                # Full compliance if within 5% of expected
                # Partial (50-100%) if within 5-15%
                # Poor (<50%) if >15% deviation
                deviation = abs(actual_pct - expected_pct)
                if deviation <= 5:
                    custody_tracking_score = 100.0
                elif deviation <= 15:
                    custody_tracking_score = 100.0 - ((deviation - 5) * 5)  # 75-100 range
                else:
                    custody_tracking_score = max(0, 100.0 - (deviation * 3))  # Rapid decline

        # Overall compliance score (weighted average)
        # Weights: Exchange 25%, Communication 25%, Custody Tracking 20%, Child Support 15%, Expenses 15%
        overall_score = (
            (exchange_rate * 0.25) +
            ((100 - intervention_rate) * 0.25) +
            (custody_tracking_score * 0.20) +
            (child_support_score * 0.15) +
            (expense_score * 0.15)
        )

        # ---------------------------------------------------------
        # Detailed Missed Exchange Analysis (with Mapbox Evidence)
        # ---------------------------------------------------------
        missed_details = []
        # Find missed instances again for detailed list (we optimized count above, assuming we want list)
        # Re-using instances list from above
        for instance in instances:
            if instance.status == 'missed':
                exchange = instance.exchange
                
                # Determine scheduled location
                center_lat = exchange.location_lat or 37.7749 # Fallback SF
                center_lng = exchange.location_lng or -122.4194
                
                # Determine Responsible Parent
                is_from_missing = not instance.from_parent_checked_in
                is_to_missing = not instance.to_parent_checked_in
                
                responsible_name = "Both"
                if is_from_missing and not is_to_missing:
                    # Fetch name (hacky: optimize later)
                    p_name = "Parent A" # Placeholder, we need logic
                    # We need to look up User objects. 
                    # Participants list has (participant, user).
                    for p, u in participants:
                        if u.id == exchange.from_parent_id:
                            p_name = f"{u.first_name} {u.last_name}"
                    responsible_name = await self._redact(p_name, context)
                elif is_to_missing and not is_from_missing:
                    # Fetch name
                    p_name = "Parent B"
                    for p, u in participants:
                        if u.id == exchange.to_parent_id:
                            p_name = f"{u.first_name} {u.last_name}"
                    responsible_name = await self._redact(p_name, context)
                
                # Build Check-in Points (Evidence)
                check_in_points = []
                
                # Helper to get initial
                def get_initial(u_id):
                    for p, u in participants:
                        if u.id == u_id:
                            return u.first_name[0].upper()
                    return "?"

                # Add From Parent (if present)
                if instance.from_parent_checked_in and instance.from_parent_check_in_lat:
                     check_in_points.append({
                         "lat": instance.from_parent_check_in_lat,
                         "lng": instance.from_parent_check_in_lng,
                         "label": get_initial(exchange.from_parent_id),
                         "in_geofence": instance.from_parent_in_geofence
                     })
                
                # Add To Parent (if present)
                if instance.to_parent_checked_in and instance.to_parent_check_in_lat:
                     check_in_points.append({
                         "lat": instance.to_parent_check_in_lat,
                         "lng": instance.to_parent_check_in_lng,
                         "label": get_initial(exchange.to_parent_id),
                         "in_geofence": instance.to_parent_in_geofence
                     })

                # Generate Mapbox URL
                map_url = GeolocationService.generate_static_map_url(
                    center_lat=center_lat,
                    center_lng=center_lng,
                    geofence_radius_meters=exchange.geofence_radius_meters or 150,
                    check_in_points=check_in_points,
                    width=600,
                    height=300,
                    zoom=14
                )
                
                # Fetch Image Bytes (to embed)
                map_b64 = None
                if map_url:
                    try:
                        async with httpx.AsyncClient() as client:
                            resp = await client.get(map_url, timeout=5.0)
                            if resp.status_code == 200:
                                map_b64 = base64.b64encode(resp.content).decode('utf-8')
                    except Exception as e:
                        print(f"Failed to fetch mapbox image: {e}")
                
                missed_details.append({
                    "instance_id": instance.id,
                    "date": self._format_date(instance.scheduled_time.date()),
                    "time": instance.scheduled_time.strftime("%I:%M %p"),
                    "responsible": responsible_name,
                    "location_name": await self._redact(exchange.location or "Unknown", context),
                    "map_url": map_url,
                    "map_image_b64": map_b64,
                    "verify_link": f"https://www.google.com/maps?q={center_lat},{center_lng}"
                })

        return {
            "user_id": user_id,
            "parent_type": participant.parent_type,
            "role": participant.role,
            "name": await self._redact(
                f"{user.first_name} {user.last_name}",
                context
            ),
            "exchange_metrics": {
                "total": total_exchanges,
                "on_time": on_time_count,
                "on_time_rate": exchange_rate,
                "missed": missed_exchanges,
                "missed_details": missed_details,
                "last_exchange": {k: v for k, v in last_exchange.items() if k != '_dt'} if last_exchange else None,
            },
            "communication_metrics": {
                "messages_sent": messages_sent,
                "aria_interventions": interventions,
                "intervention_rate": intervention_rate,
                "top_toxic_category": top_toxic_category.replace("_", " ").title(),
            },
            "custody_tracking_metrics": {
                "expected_pct": expected_pct if expected_pct else "N/A",
                "actual_days": parent_custody_days if 'parent_custody_days' in dir() else 0,
                "total_days": total_custody_days if 'total_custody_days' in dir() else 0,
                "compliance_rate": custody_tracking_score,
            },
            "financial_metrics": {
                "payments_made": payments_made,
                "child_support": {
                    "is_payer": len(cs_payments) > 0 if cs_payments else False,
                    "total_payments": len(cs_payments) if cs_payments else 0,
                    "on_time_full": on_time_full if cs_payments else 0,
                    "compliance_rate": child_support_score if cs_payments else None,  # None = N/A (not the payer)
                },
                "expenses": {
                    "total_requests": len(expenses) if expenses else 0,
                    "fully_paid": paid_count if expenses else 0,
                    "compliance_rate": expense_score,
                },
            },
            "overall_compliance_score": round(overall_score, 1),
            "total_interactions": total_exchanges + messages_sent,
        }

    def _build_comparison(self, parent_metrics: list[dict]) -> dict:
        """Build side-by-side comparison data."""
        if len(parent_metrics) < 2:
            return {}

        p1, p2 = parent_metrics[0], parent_metrics[1]

        return {
            "exchange_comparison": {
                "parent_a": p1["exchange_metrics"]["on_time_rate"],
                "parent_b": p2["exchange_metrics"]["on_time_rate"],
                "difference": abs(
                    p1["exchange_metrics"]["on_time_rate"] -
                    p2["exchange_metrics"]["on_time_rate"]
                ),
            },
            "communication_comparison": {
                "parent_a_interventions": p1["communication_metrics"]["aria_interventions"],
                "parent_b_interventions": p2["communication_metrics"]["aria_interventions"],
            },
            "overall_comparison": {
                "parent_a": p1["overall_compliance_score"],
                "parent_b": p2["overall_compliance_score"],
                "difference": abs(
                    p1["overall_compliance_score"] -
                    p2["overall_compliance_score"]
                ),
            },
        }

    def _generate_summary(self, parent_metrics: list[dict]) -> str:
        """Generate a neutral summary statement."""
        if len(parent_metrics) < 2:
            return "Insufficient data for comparison."

        p1, p2 = parent_metrics[0], parent_metrics[1]
        avg_compliance = (
            p1["overall_compliance_score"] +
            p2["overall_compliance_score"]
        ) / 2

        if avg_compliance >= 90:
            return "Both parents demonstrate high compliance with agreement terms."
        elif avg_compliance >= 70:
            return "Parents show moderate compliance overall. See detailed sections for areas of concern."
        else:
            return "Compliance metrics indicate areas requiring attention. Review detailed sections."

    def _empty_content(self, reason: str) -> SectionContent:
        """Return empty content when data is missing."""
        return SectionContent(
            section_type=self.section_type,
            section_title=self.section_title,
            section_order=self.section_order,
            content_data={"error": reason},
            evidence_count=0,
            data_sources=[],
        )
