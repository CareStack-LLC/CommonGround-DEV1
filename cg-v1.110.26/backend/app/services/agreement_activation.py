"""
Agreement Activation Service

Handles automatic extraction and creation when a SharedCare Agreement is activated:
1. Parse structured_data from agreement sections
2. Create recurring CustodyExchange records from parenting time
3. Store expense split ratio on FamilyFile
4. Set default exchange location

This service is called when both parents approve and the agreement status
changes to "active".
"""

import uuid
import logging
import re
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from dateutil.rrule import rrule, WEEKLY, MONTHLY
from dateutil.relativedelta import relativedelta

from app.models.agreement import Agreement, AgreementSection
from app.models.family_file import FamilyFile
from app.models.custody_exchange import CustodyExchange, CustodyExchangeInstance
from app.models.child import Child
from app.models.clearfund import Obligation, ObligationFunding
from app.schemas.parenting_schedule import (
    ParentingTimeData,
    LogisticsData,
    ExpenseData,
    ChildSupportData,
    ActivationResult,
    SCHEDULE_PATTERN_MAPPING,
    parse_split_ratio,
    get_day_number,
    get_recurrence_days_for_pattern,
    parse_transition_time,
)

logger = logging.getLogger(__name__)


class AgreementActivationService:
    """
    Service for handling agreement activation side effects.

    When an agreement is activated, this service:
    1. Extracts structured data from agreement sections
    2. Creates recurring custody exchanges based on parenting schedule
    3. Sets expense split ratio on the family file
    4. Sets default exchange location on the family file
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def activate_agreement(
        self,
        agreement: Agreement,
        activated_by: str
    ) -> ActivationResult:
        """
        Process agreement activation and create derived records.

        Args:
            agreement: The agreement being activated
            activated_by: User ID who triggered activation

        Returns:
            ActivationResult with created resources summary
        """
        result = ActivationResult()

        # Get the family file
        family_file = await self._get_family_file(agreement)
        if not family_file:
            result.errors.append("No family file associated with agreement")
            return result

        # Get children for the family
        children = await self._get_children(family_file.id)
        child_ids = [str(c.id) for c in children]

        if not child_ids:
            result.errors.append("No children found in family file")
            # Continue anyway - some agreements may not have children yet

        # Extract structured data from sections
        parenting_data = await self._extract_parenting_time(agreement)
        logistics_data = await self._extract_logistics(agreement)
        expense_data = await self._extract_expenses(agreement)
        child_support_data = await self._extract_child_support(agreement)

        # Log what we extracted
        logger.info(
            f"Agreement {agreement.id} activation - Extracted: "
            f"parenting_time={parenting_data is not None}, "
            f"logistics={logistics_data is not None}, "
            f"expenses={expense_data is not None}, "
            f"child_support={child_support_data is not None}"
        )

        # Create custody exchanges from parenting schedule
        if parenting_data and child_ids:
            try:
                exchanges = await self._create_custody_exchanges(
                    family_file=family_file,
                    agreement=agreement,
                    parenting_data=parenting_data,
                    logistics_data=logistics_data,
                    child_ids=child_ids,
                    created_by=activated_by
                )
                result.exchanges_created = len(exchanges)
                logger.info(f"Created {len(exchanges)} custody exchanges for agreement {agreement.id}")
            except Exception as e:
                logger.error(f"Failed to create exchanges for agreement {agreement.id}: {e}")
                result.errors.append(f"Failed to create exchanges: {str(e)}")

        # Set expense split ratio on family file
        if expense_data:
            try:
                await self._set_expense_split(
                    family_file=family_file,
                    agreement=agreement,
                    expense_data=expense_data
                )
                result.split_ratio_set = True
                logger.info(f"Set expense split ratio {expense_data.split_ratio} for family file {family_file.id}")
            except Exception as e:
                logger.error(f"Failed to set split ratio for agreement {agreement.id}: {e}")
                result.errors.append(f"Failed to set split ratio: {str(e)}")

        # Set default exchange location on family file
        if logistics_data:
            try:
                await self._set_exchange_location(
                    family_file=family_file,
                    logistics_data=logistics_data
                )
                result.exchange_location_set = True
                logger.info(f"Set exchange location for family file {family_file.id}")
            except Exception as e:
                logger.error(f"Failed to set exchange location for agreement {agreement.id}: {e}")
                result.errors.append(f"Failed to set exchange location: {str(e)}")

        # Create recurring child support obligations
        if child_support_data and child_support_data.has_support:
            try:
                template, instances_count = await self._create_recurring_child_support(
                    family_file=family_file,
                    agreement=agreement,
                    child_support_data=child_support_data,
                    child_ids=child_ids,
                    created_by=activated_by
                )
                if template:
                    result.recurring_obligations_created += 1
                    result.obligation_instances_created += instances_count
                    logger.info(
                        f"Created child support template with {instances_count} instances "
                        f"for agreement {agreement.id}"
                    )
            except Exception as e:
                logger.error(f"Failed to create child support obligations for agreement {agreement.id}: {e}")
                result.errors.append(f"Failed to create child support obligations: {str(e)}")

        # Create recurring expense templates (volleyball, medicine, etc.)
        if expense_data:
            try:
                templates_created, instances_created = await self._create_recurring_expense_templates(
                    family_file=family_file,
                    agreement=agreement,
                    expense_data=expense_data,
                    child_ids=child_ids,
                    created_by=activated_by
                )
                if templates_created > 0:
                    result.recurring_obligations_created += templates_created
                    result.obligation_instances_created += instances_created
                    logger.info(
                        f"Created {templates_created} recurring expense templates with {instances_created} instances "
                        f"for agreement {agreement.id}"
                    )
            except Exception as e:
                logger.error(f"Failed to create recurring expense templates for agreement {agreement.id}: {e}")
                result.errors.append(f"Failed to create recurring expense templates: {str(e)}")

        await self.db.commit()
        return result

    async def preview_activation(
        self,
        agreement: Agreement
    ) -> Dict[str, Any]:
        """
        Preview what will be created when agreement is activated.

        Args:
            agreement: The agreement to preview

        Returns:
            Dictionary with preview information
        """
        parenting_data = await self._extract_parenting_time(agreement)
        logistics_data = await self._extract_logistics(agreement)
        expense_data = await self._extract_expenses(agreement)
        child_support_data = await self._extract_child_support(agreement)

        family_file = await self._get_family_file(agreement)
        children = await self._get_children(family_file.id) if family_file else []

        preview = {
            "parenting_schedule": parenting_data.model_dump() if parenting_data else None,
            "logistics": logistics_data.model_dump() if logistics_data else None,
            "expense_split": expense_data.model_dump() if expense_data else None,
            "child_support": child_support_data.model_dump() if child_support_data else None,
            "will_create_exchanges": parenting_data is not None and len(children) > 0,
            "will_lock_split_ratio": expense_data is not None,
            "will_create_recurring_support": (
                child_support_data is not None and child_support_data.has_support
            ),
            "children_count": len(children),
            "exchange_pattern_info": None,
        }

        # Add exchange pattern details
        if parenting_data:
            pattern = parenting_data.schedule_pattern
            pattern_info = SCHEDULE_PATTERN_MAPPING.get(pattern, {})
            preview["exchange_pattern_info"] = {
                "pattern": pattern,
                "description": pattern_info.get("description", "Custom schedule"),
                "exchanges_per_period": pattern_info.get("exchanges_per_period"),
                "typical_days": pattern_info.get("typical_exchange_days", []),
            }

        return preview

    async def deactivate_agreement(
        self,
        agreement: Agreement,
        superseded_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Handle agreement deactivation.

        Does NOT delete exchanges - marks them as superseded to preserve audit trail.
        New agreement activation will create new exchanges.

        Args:
            agreement: The agreement being deactivated
            superseded_by: ID of new agreement (if any)

        Returns:
            Summary of changes
        """
        result = {
            "exchanges_marked": 0,
            "split_cleared": False
        }

        # Mark existing exchanges as superseded (don't delete for audit)
        exchanges_query = await self.db.execute(
            select(CustodyExchange).where(
                CustodyExchange.agreement_id == agreement.id,
                CustodyExchange.status == "active"
            )
        )
        exchanges = exchanges_query.scalars().all()

        for exchange in exchanges:
            exchange.status = "superseded"
            result["exchanges_marked"] += 1

        # Clear split ratio lock if this agreement set it
        if agreement.family_file_id:
            family_file = await self._get_family_file(agreement)
            if family_file and family_file.agreement_split_source_id == agreement.id:
                family_file.agreement_split_locked = False
                result["split_cleared"] = True

        await self.db.commit()
        logger.info(
            f"Deactivated agreement {agreement.id}: "
            f"marked {result['exchanges_marked']} exchanges, "
            f"cleared split: {result['split_cleared']}"
        )
        return result

    # =========================================================================
    # Private Methods - Data Extraction
    # =========================================================================

    async def _get_family_file(self, agreement: Agreement) -> Optional[FamilyFile]:
        """Get the family file for an agreement."""
        if agreement.family_file_id:
            result = await self.db.execute(
                select(FamilyFile).where(FamilyFile.id == agreement.family_file_id)
            )
            return result.scalar_one_or_none()
        return None

    async def _get_children(self, family_file_id: str) -> List[Child]:
        """Get active children for a family file."""
        result = await self.db.execute(
            select(Child).where(
                Child.family_file_id == family_file_id,
                Child.status == "active"
            )
        )
        return list(result.scalars().all())

    async def _extract_parenting_time(self, agreement: Agreement) -> Optional[ParentingTimeData]:
        """
        Extract parenting_time structured data from agreement sections.

        Looks for sections with type 'schedule' and title containing 'parenting time'.
        """
        result = await self.db.execute(
            select(AgreementSection).where(
                AgreementSection.agreement_id == agreement.id
            )
        )
        sections = result.scalars().all()

        # Try to find parenting_time section (v2) or schedule section (v1)
        for section in sections:
            section_title_lower = (section.section_title or "").lower()
            section_type = section.section_type or ""

            # Check for v2 parenting_time section
            if "parenting" in section_title_lower or section_type == "parenting_time":
                if section.structured_data:
                    data = section.structured_data
                    try:
                        return ParentingTimeData(
                            primary_residence=data.get("primary_residence", "equal"),
                            schedule_pattern=data.get("schedule_pattern", "week_on_week_off"),
                            custom_pattern_description=data.get("custom_pattern_description"),
                            transition_day=data.get("transition_day", "Sunday"),
                            transition_time=data.get("transition_time", "6:00 PM"),
                            schedule_notes=data.get("schedule_notes")
                        )
                    except Exception as e:
                        logger.warning(f"Failed to parse parenting_time data: {e}")

            # Check for v1 schedule section
            elif section_type == "schedule" and "time schedule" in section_title_lower:
                if section.structured_data:
                    data = section.structured_data
                    try:
                        return ParentingTimeData(
                            primary_residence=data.get("primary_parent", "equal"),
                            schedule_pattern=data.get("schedule_type", "week_on_week_off"),
                            transition_day=data.get("transition_day", "Sunday"),
                            transition_time=data.get("transition_time", "6:00 PM"),
                            schedule_notes=data.get("notes")
                        )
                    except Exception as e:
                        logger.warning(f"Failed to parse v1 schedule data: {e}")

        return None

    async def _extract_logistics(self, agreement: Agreement) -> Optional[LogisticsData]:
        """Extract logistics_transitions structured data from agreement sections."""
        result = await self.db.execute(
            select(AgreementSection).where(
                AgreementSection.agreement_id == agreement.id
            )
        )
        sections = result.scalars().all()

        for section in sections:
            section_title_lower = (section.section_title or "").lower()
            section_type = section.section_type or ""

            # Check for logistics section
            if "logistics" in section_title_lower or section_type == "logistics":
                if section.structured_data:
                    data = section.structured_data
                    try:
                        return LogisticsData(
                            exchange_location=data.get("exchange_location", "school"),
                            exchange_location_address=data.get("exchange_location_address"),
                            transportation_responsibility=data.get(
                                "transportation_responsibility", "shared"
                            ),
                            transition_communication=data.get(
                                "transition_communication", "commonground"
                            ),
                            backup_plan=data.get("backup_plan")
                        )
                    except Exception as e:
                        logger.warning(f"Failed to parse logistics data: {e}")

            # Check for v1 transportation section
            elif section_type == "logistics" or "transportation" in section_title_lower:
                if section.structured_data:
                    data = section.structured_data
                    try:
                        return LogisticsData(
                            exchange_location=data.get("exchange_location", "school"),
                            exchange_location_address=data.get("location_address"),
                            transportation_responsibility=data.get(
                                "responsibility", "shared"
                            ),
                            transition_communication="commonground"
                        )
                    except Exception as e:
                        logger.warning(f"Failed to parse v1 transportation data: {e}")

        return None

    async def _extract_expenses(self, agreement: Agreement) -> Optional[ExpenseData]:
        """Extract expenses_financial structured data from agreement sections."""
        result = await self.db.execute(
            select(AgreementSection).where(
                AgreementSection.agreement_id == agreement.id
            )
        )
        sections = result.scalars().all()

        for section in sections:
            section_title_lower = (section.section_title or "").lower()
            section_type = section.section_type or ""

            # Check for expenses section
            if "expense" in section_title_lower or section_type == "financial":
                if section.structured_data:
                    data = section.structured_data
                    try:
                        return ExpenseData(
                            expense_categories=data.get(
                                "expense_categories", ["medical", "education"]
                            ),
                            split_ratio=data.get("split_ratio", "50/50"),
                            custom_split_details=data.get("custom_split_details"),
                            reimbursement_window=data.get("reimbursement_window", "30_days"),
                            documentation_required=data.get("documentation_required", True),
                            payment_method=data.get("payment_method", "commonground_clearfund")
                        )
                    except Exception as e:
                        logger.warning(f"Failed to parse expenses data: {e}")

        return None

    # =========================================================================
    # Private Methods - Creation
    # =========================================================================

    async def _create_custody_exchanges(
        self,
        family_file: FamilyFile,
        agreement: Agreement,
        parenting_data: ParentingTimeData,
        logistics_data: Optional[LogisticsData],
        child_ids: List[str],
        created_by: str
    ) -> List[CustodyExchange]:
        """
        Create recurring custody exchanges based on schedule pattern.

        Args:
            family_file: The family file
            agreement: The agreement being activated
            parenting_data: Extracted parenting time data
            logistics_data: Extracted logistics data (optional)
            child_ids: List of child IDs to include
            created_by: User ID creating the exchanges

        Returns:
            List of created CustodyExchange records
        """
        exchanges = []
        pattern = parenting_data.schedule_pattern
        pattern_info = SCHEDULE_PATTERN_MAPPING.get(pattern, {})

        # Calculate first exchange date (next occurrence of transition_day)
        transition_day_num = get_day_number(parenting_data.transition_day)
        now = datetime.utcnow()
        days_until = (transition_day_num - now.weekday()) % 7
        if days_until == 0:
            days_until = 7  # Next week
        first_date = now + timedelta(days=days_until)

        # Parse transition time
        hour, minute = parse_transition_time(parenting_data.transition_time)
        scheduled_time = first_date.replace(hour=hour, minute=minute, second=0, microsecond=0)

        # Get location from logistics
        location = None
        if logistics_data:
            if logistics_data.exchange_location_address:
                location = logistics_data.exchange_location_address
            else:
                location = logistics_data.exchange_location

        # Get recurrence pattern
        recurrence_pattern = pattern_info.get("recurrence_pattern", "weekly")
        recurrence_days = get_recurrence_days_for_pattern(pattern, parenting_data.transition_day)

        # Create exchanges based on pattern
        if pattern == "week_on_week_off":
            # One biweekly exchange
            exchange = await self._create_single_exchange(
                family_file=family_file,
                agreement=agreement,
                exchange_type="both",
                scheduled_time=scheduled_time,
                is_recurring=True,
                recurrence_pattern="biweekly",
                recurrence_days=recurrence_days,
                location=location,
                child_ids=child_ids,
                created_by=created_by,
                title="Weekly Custody Exchange"
            )
            exchanges.append(exchange)

        elif pattern == "2-2-3":
            # Multiple exchanges per week (Mon, Wed, Fri)
            exchange_days = ["Monday", "Wednesday", "Friday"]
            for i, day_name in enumerate(exchange_days):
                day_num = get_day_number(day_name)
                days_offset = (day_num - now.weekday()) % 7
                if days_offset == 0 and i > 0:
                    days_offset = 7
                day_date = now + timedelta(days=days_offset)
                day_time = day_date.replace(hour=hour, minute=minute, second=0, microsecond=0)

                exchange = await self._create_single_exchange(
                    family_file=family_file,
                    agreement=agreement,
                    exchange_type="both",
                    scheduled_time=day_time,
                    is_recurring=True,
                    recurrence_pattern="weekly",
                    recurrence_days=[(day_num + 1) % 7],  # Convert to recurrence_days format
                    location=location,
                    child_ids=child_ids,
                    created_by=created_by,
                    title=f"{day_name} Exchange"
                )
                exchanges.append(exchange)

        elif pattern == "every_other_weekend":
            # Friday pickup, Sunday dropoff (biweekly)
            friday_num = 4  # Friday
            sunday_num = 6  # Sunday

            # Friday pickup
            friday_offset = (friday_num - now.weekday()) % 7
            if friday_offset == 0:
                friday_offset = 7
            friday_date = now + timedelta(days=friday_offset)
            friday_time = friday_date.replace(hour=18, minute=0, second=0, microsecond=0)

            exchange = await self._create_single_exchange(
                family_file=family_file,
                agreement=agreement,
                exchange_type="pickup",
                scheduled_time=friday_time,
                is_recurring=True,
                recurrence_pattern="biweekly",
                recurrence_days=[6],  # Friday in recurrence_days format
                location=location,
                child_ids=child_ids,
                created_by=created_by,
                title="Weekend Pickup (Friday)"
            )
            exchanges.append(exchange)

            # Sunday dropoff
            sunday_date = friday_date + timedelta(days=2)
            sunday_time = sunday_date.replace(hour=18, minute=0, second=0, microsecond=0)

            exchange = await self._create_single_exchange(
                family_file=family_file,
                agreement=agreement,
                exchange_type="dropoff",
                scheduled_time=sunday_time,
                is_recurring=True,
                recurrence_pattern="biweekly",
                recurrence_days=[0],  # Sunday in recurrence_days format
                location=location,
                child_ids=child_ids,
                created_by=created_by,
                title="Weekend Dropoff (Sunday)"
            )
            exchanges.append(exchange)

        else:
            # Default: single weekly exchange on transition day
            exchange = await self._create_single_exchange(
                family_file=family_file,
                agreement=agreement,
                exchange_type="both",
                scheduled_time=scheduled_time,
                is_recurring=True,
                recurrence_pattern=recurrence_pattern if recurrence_pattern != "custom" else "weekly",
                recurrence_days=recurrence_days if recurrence_days else [transition_day_num],
                location=location,
                child_ids=child_ids,
                created_by=created_by,
                title=f"{parenting_data.transition_day} Custody Exchange"
            )
            exchanges.append(exchange)

        return exchanges

    async def _create_single_exchange(
        self,
        family_file: FamilyFile,
        agreement: Agreement,
        exchange_type: str,
        scheduled_time: datetime,
        is_recurring: bool,
        recurrence_pattern: str,
        recurrence_days: List[int],
        location: Optional[str],
        child_ids: List[str],
        created_by: str,
        title: str
    ) -> CustodyExchange:
        """Create a single custody exchange record with instances."""
        exchange = CustodyExchange(
            id=str(uuid.uuid4()),
            case_id=None,
            family_file_id=family_file.id,
            agreement_id=agreement.id,
            created_by=created_by,
            exchange_type=exchange_type,
            title=title,
            from_parent_id=family_file.parent_a_id,
            to_parent_id=family_file.parent_b_id,
            child_ids=child_ids,
            pickup_child_ids=child_ids if exchange_type in ["pickup", "both"] else [],
            dropoff_child_ids=child_ids if exchange_type in ["dropoff", "both"] else [],
            location=location,
            scheduled_time=scheduled_time,
            duration_minutes=30,
            is_recurring=is_recurring,
            recurrence_pattern=recurrence_pattern,
            recurrence_days=recurrence_days,
            status="active",
            special_instructions=f"Created by ARIA based on agreement: {agreement.title}"
        )

        self.db.add(exchange)
        await self.db.flush()

        # Generate initial instances (8 weeks ahead)
        await self._generate_instances(exchange, scheduled_time, weeks_ahead=8)

        return exchange

    async def _generate_instances(
        self,
        exchange: CustodyExchange,
        start_date: datetime,
        weeks_ahead: int = 8
    ) -> None:
        """Generate exchange instances for the upcoming period."""
        if not exchange.is_recurring:
            # Single occurrence
            instance = CustodyExchangeInstance(
                id=str(uuid.uuid4()),
                exchange_id=exchange.id,
                scheduled_time=start_date,
                status="scheduled"
            )
            self.db.add(instance)
            return

        # Generate recurring instances
        end_date = start_date + timedelta(weeks=weeks_ahead)
        current_date = start_date

        while current_date <= end_date:
            # Check if this day matches recurrence pattern
            if self._matches_recurrence(exchange, current_date):
                instance = CustodyExchangeInstance(
                    id=str(uuid.uuid4()),
                    exchange_id=exchange.id,
                    scheduled_time=current_date.replace(
                        hour=exchange.scheduled_time.hour,
                        minute=exchange.scheduled_time.minute
                    ),
                    status="scheduled"
                )
                self.db.add(instance)

            current_date += timedelta(days=1)

    def _matches_recurrence(self, exchange: CustodyExchange, date: datetime) -> bool:
        """Check if a date matches the exchange recurrence pattern."""
        if not exchange.recurrence_days:
            return False

        # Convert Python weekday (0=Mon) to recurrence_days format (0=Sun)
        recurrence_day = (date.weekday() + 1) % 7

        if recurrence_day not in exchange.recurrence_days:
            return False

        # Check biweekly pattern
        if exchange.recurrence_pattern == "biweekly":
            days_since_start = (date - exchange.scheduled_time).days
            week_number = days_since_start // 7
            if week_number % 2 != 0:  # Odd weeks are skipped
                return False

        return True

    async def _set_expense_split(
        self,
        family_file: FamilyFile,
        agreement: Agreement,
        expense_data: ExpenseData
    ) -> None:
        """Store expense split ratio on family file."""
        parent_a_pct, _ = parse_split_ratio(expense_data.split_ratio)

        family_file.agreement_expense_split_ratio = expense_data.split_ratio
        family_file.agreement_split_parent_a_percentage = parent_a_pct
        family_file.agreement_split_locked = True
        family_file.agreement_split_source_id = agreement.id
        family_file.agreement_split_set_at = datetime.utcnow()

    async def _set_exchange_location(
        self,
        family_file: FamilyFile,
        logistics_data: LogisticsData
    ) -> None:
        """Store default exchange location on family file."""
        family_file.default_exchange_location = logistics_data.exchange_location_address
        family_file.default_exchange_location_type = logistics_data.exchange_location

    async def _extract_child_support(self, agreement: Agreement) -> Optional[ChildSupportData]:
        """
        Extract child_support structured data from agreement sections.

        Looks for section_10_child_support or sections with 'child support' in title.
        """
        result = await self.db.execute(
            select(AgreementSection).where(
                AgreementSection.agreement_id == agreement.id
            )
        )
        sections = result.scalars().all()

        for section in sections:
            section_title_lower = (section.section_title or "").lower()
            section_type = section.section_type or ""

            # Check for child support section
            if (
                "child support" in section_title_lower
                or section_type == "child_support"
                or "section_10" in section_type.lower()
            ):
                if section.structured_data:
                    data = section.structured_data
                    try:
                        return ChildSupportData(
                            has_support=data.get("has_support", False),
                            payer_parent_role=self._parse_payer_role(data),
                            receiver_parent_role=self._parse_receiver_role(data),
                            amount=self._parse_amount(data),
                            frequency=data.get("frequency", "monthly"),
                            due_day=self._parse_due_day(data),
                            payment_method=data.get("payment_method")
                        )
                    except Exception as e:
                        logger.warning(f"Failed to parse child_support data: {e}")

        return None

    def _parse_payer_role(self, data: Dict[str, Any]) -> Optional[str]:
        """Parse who pays child support from structured data."""
        payer = data.get("payer_parent_role") or data.get("payer") or data.get("paying_parent")
        if payer:
            payer_lower = str(payer).lower()
            if "parent_a" in payer_lower or "petitioner" in payer_lower or payer_lower == "a":
                return "parent_a"
            elif "parent_b" in payer_lower or "respondent" in payer_lower or payer_lower == "b":
                return "parent_b"
        return None

    def _parse_receiver_role(self, data: Dict[str, Any]) -> Optional[str]:
        """Parse who receives child support from structured data."""
        receiver = data.get("receiver_parent_role") or data.get("receiver") or data.get("receiving_parent")
        if receiver:
            receiver_lower = str(receiver).lower()
            if "parent_a" in receiver_lower or "petitioner" in receiver_lower or receiver_lower == "a":
                return "parent_a"
            elif "parent_b" in receiver_lower or "respondent" in receiver_lower or receiver_lower == "b":
                return "parent_b"
        # Infer from payer if not specified
        payer = self._parse_payer_role(data)
        if payer == "parent_a":
            return "parent_b"
        elif payer == "parent_b":
            return "parent_a"
        return None

    def _parse_amount(self, data: Dict[str, Any]) -> Optional[float]:
        """Parse payment amount from structured data."""
        amount = data.get("amount") or data.get("monthly_amount") or data.get("payment_amount")
        if amount is not None:
            try:
                if isinstance(amount, str):
                    # Remove currency symbols and commas
                    amount = re.sub(r"[^\d.]", "", amount)
                return float(amount)
            except (ValueError, TypeError):
                pass
        return None

    def _parse_due_day(self, data: Dict[str, Any]) -> Optional[int]:
        """Parse due day of month from structured data."""
        due_day = data.get("due_day") or data.get("payment_day") or data.get("due_date")
        if due_day is not None:
            try:
                day = int(due_day)
                if 1 <= day <= 28:
                    return day
            except (ValueError, TypeError):
                pass
        return 1  # Default to 1st of month

    # =========================================================================
    # Private Methods - Recurring Obligation Creation
    # =========================================================================

    async def _create_recurring_child_support(
        self,
        family_file: FamilyFile,
        agreement: Agreement,
        child_support_data: ChildSupportData,
        child_ids: List[str],
        created_by: str,
        months_ahead: int = 6
    ) -> tuple[Optional[Obligation], int]:
        """
        Create recurring child support template and generate instances.

        Args:
            family_file: The family file
            agreement: The agreement being activated
            child_support_data: Extracted child support configuration
            child_ids: List of child IDs affected
            created_by: User ID creating the obligations
            months_ahead: How many months of instances to generate

        Returns:
            Tuple of (template obligation, number of instances created)
        """
        if not child_support_data.amount:
            logger.warning("Child support has no amount specified, skipping")
            return None, 0

        # Determine payer and receiver parent IDs
        payer_id = None
        receiver_id = None

        if child_support_data.payer_parent_role == "parent_a":
            payer_id = family_file.parent_a_id
            receiver_id = family_file.parent_b_id
        elif child_support_data.payer_parent_role == "parent_b":
            payer_id = family_file.parent_b_id
            receiver_id = family_file.parent_a_id
        else:
            logger.warning("Child support payer role not specified, skipping")
            return None, 0

        if not payer_id or not receiver_id:
            logger.warning("Could not determine payer/receiver IDs")
            return None, 0

        # Build recurrence rule (iCal RRULE format)
        due_day = child_support_data.due_day or 1
        recurrence_rule = self._build_recurrence_rule(
            frequency=child_support_data.frequency,
            due_day=due_day
        )

        amount = Decimal(str(child_support_data.amount))

        # Create template obligation
        template = Obligation(
            id=str(uuid.uuid4()),
            family_file_id=family_file.id,
            agreement_id=agreement.id,
            source_type="agreement",
            source_id=agreement.id,
            purpose_category="child_support",
            title=f"Child Support - {child_support_data.frequency.capitalize()}",
            description=f"Recurring child support payment. Created by ARIA based on agreement: {agreement.title}",
            child_ids=child_ids,
            total_amount=amount,
            petitioner_share=amount if payer_id == family_file.parent_a_id else Decimal("0"),
            respondent_share=amount if payer_id == family_file.parent_b_id else Decimal("0"),
            petitioner_percentage=100 if payer_id == family_file.parent_a_id else 0,
            split_from_agreement=True,
            status="template",  # Mark as template, not for direct payment
            is_recurring=True,
            recurrence_rule=recurrence_rule,
            verification_required=False,
            receipt_required=False,
            created_by=created_by,
        )

        self.db.add(template)
        await self.db.flush()

        # Generate instances for the next N months
        instances_count = await self._generate_obligation_instances(
            template=template,
            family_file=family_file,
            payer_id=payer_id,
            months_ahead=months_ahead
        )

        return template, instances_count

    def _build_recurrence_rule(self, frequency: str, due_day: int) -> str:
        """Build iCal RRULE string for the given frequency."""
        freq_lower = frequency.lower()

        if freq_lower == "weekly":
            return "FREQ=WEEKLY"
        elif freq_lower == "biweekly":
            return "FREQ=WEEKLY;INTERVAL=2"
        elif freq_lower == "semimonthly":
            return f"FREQ=MONTHLY;BYMONTHDAY=1,15"
        else:  # monthly (default)
            return f"FREQ=MONTHLY;BYMONTHDAY={due_day}"

    async def _generate_obligation_instances(
        self,
        template: Obligation,
        family_file: FamilyFile,
        payer_id: str,
        months_ahead: int = 6
    ) -> int:
        """
        Generate obligation instances from a recurring template.

        Args:
            template: The template obligation with recurrence_rule
            family_file: The family file
            payer_id: ID of the parent who pays
            months_ahead: Number of months to generate ahead

        Returns:
            Number of instances created
        """
        # Get recurrence dates
        now = datetime.utcnow()
        end_date = now + relativedelta(months=months_ahead)
        dates = self._get_recurrence_dates(
            recurrence_rule=template.recurrence_rule,
            start_date=now,
            end_date=end_date
        )

        count = 0
        for due_date in dates:
            # Create instance obligation
            instance = Obligation(
                id=str(uuid.uuid4()),
                family_file_id=family_file.id,
                agreement_id=template.agreement_id,
                parent_obligation_id=template.id,  # Link to template
                source_type="agreement",
                source_id=template.agreement_id,
                purpose_category="child_support",
                title=f"Child Support - {due_date.strftime('%B %Y')}",
                description=template.description,  # Inherit description from template
                child_ids=template.child_ids,
                total_amount=template.total_amount,
                petitioner_share=template.petitioner_share,
                respondent_share=template.respondent_share,
                petitioner_percentage=template.petitioner_percentage,
                split_from_agreement=True,
                due_date=due_date,
                status="open",
                is_recurring=False,  # Instance is not recurring itself
                verification_required=False,
                receipt_required=False,
                created_by=template.created_by,
            )
            self.db.add(instance)
            await self.db.flush()

            # Create funding record for the payer
            funding = ObligationFunding(
                id=str(uuid.uuid4()),
                obligation_id=instance.id,
                parent_id=payer_id,
                amount_required=template.total_amount,
                amount_funded=Decimal("0"),
            )
            self.db.add(funding)

            count += 1

        await self.db.flush()
        return count

    def _get_recurrence_dates(
        self,
        recurrence_rule: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[datetime]:
        """
        Parse RRULE and generate dates between start and end.

        Args:
            recurrence_rule: iCal RRULE string (e.g., "FREQ=MONTHLY;BYMONTHDAY=1")
            start_date: Start date for generation
            end_date: End date for generation

        Returns:
            List of datetime objects for each occurrence
        """
        dates = []

        # Parse the rule
        parts = {}
        for part in recurrence_rule.split(";"):
            if "=" in part:
                key, value = part.split("=", 1)
                parts[key] = value

        freq = parts.get("FREQ", "MONTHLY")
        interval = int(parts.get("INTERVAL", 1))
        by_monthday = parts.get("BYMONTHDAY")

        # Build rrule
        if freq == "WEEKLY":
            rule = rrule(
                WEEKLY,
                interval=interval,
                dtstart=start_date,
                until=end_date
            )
        else:  # MONTHLY
            if by_monthday:
                # Handle multiple days (e.g., "1,15" for semimonthly)
                days = [int(d) for d in by_monthday.split(",")]
                rule = rrule(
                    MONTHLY,
                    interval=interval,
                    bymonthday=days,
                    dtstart=start_date,
                    until=end_date
                )
            else:
                rule = rrule(
                    MONTHLY,
                    interval=interval,
                    dtstart=start_date,
                    until=end_date
                )

        for dt in rule:
            if start_date <= dt <= end_date:
                dates.append(dt)

        return dates

    async def _create_recurring_expense_templates(
        self,
        family_file: FamilyFile,
        agreement: Agreement,
        expense_data: ExpenseData,
        child_ids: List[str],
        created_by: str,
        months_ahead: int = 6
    ) -> tuple[int, int]:
        """
        Create recurring expense templates from agreement.

        This extracts specific recurring expenses mentioned in the agreement
        (e.g., "volleyball classes $100/month", "therapy $150/week") and creates
        recurring obligation templates for each.

        Args:
            family_file: The family file
            agreement: The agreement being activated
            expense_data: Extracted expense configuration (for split ratio)
            child_ids: List of child IDs affected
            created_by: User ID creating the obligations
            months_ahead: How many months of instances to generate

        Returns:
            Tuple of (templates_created, total_instances_created)
        """
        templates_created = 0
        total_instances = 0

        # Extract recurring expenses from agreement sections
        recurring_expenses = await self._extract_recurring_expenses(agreement)

        if not recurring_expenses:
            return 0, 0

        # Determine split percentages from expense_data
        petitioner_percentage = 50  # Default 50/50
        if expense_data and expense_data.split_ratio:
            petitioner_percentage, _ = parse_split_ratio(expense_data.split_ratio)

        # Create template for each recurring expense
        for expense in recurring_expenses:
            try:
                template, instances_count = await self._create_single_expense_template(
                    family_file=family_file,
                    agreement=agreement,
                    expense=expense,
                    child_ids=child_ids,
                    petitioner_percentage=petitioner_percentage,
                    created_by=created_by,
                    months_ahead=months_ahead
                )
                if template:
                    templates_created += 1
                    total_instances += instances_count
            except Exception as e:
                logger.error(f"Failed to create expense template for {expense.get('category')}: {e}")
                continue

        return templates_created, total_instances

    async def _extract_recurring_expenses(self, agreement: Agreement) -> List[Dict[str, Any]]:
        """
        Extract recurring expenses from agreement sections.

        Looks for structured_data with 'recurring_expenses' field containing:
        [
            {
                "category": "extracurricular",  # or "medical", "education", etc.
                "description": "Volleyball classes",
                "amount": 100.00,
                "frequency": "monthly",  # "weekly", "biweekly", "monthly"
                "due_day": 1  # Optional: day of month (1-28)
            }
        ]

        Args:
            agreement: The agreement to extract from

        Returns:
            List of recurring expense dictionaries
        """
        result = await self.db.execute(
            select(AgreementSection).where(
                AgreementSection.agreement_id == agreement.id
            )
        )
        sections = result.scalars().all()

        all_recurring_expenses = []

        for section in sections:
            if not section.structured_data:
                continue

            # Check if this section has recurring_expenses
            recurring_expenses = section.structured_data.get("recurring_expenses")
            if recurring_expenses and isinstance(recurring_expenses, list):
                all_recurring_expenses.extend(recurring_expenses)

        return all_recurring_expenses

    async def _create_single_expense_template(
        self,
        family_file: FamilyFile,
        agreement: Agreement,
        expense: Dict[str, Any],
        child_ids: List[str],
        petitioner_percentage: int,
        created_by: str,
        months_ahead: int = 6
    ) -> tuple[Optional[Obligation], int]:
        """
        Create a single recurring expense template with instances.

        Args:
            family_file: The family file
            agreement: The agreement
            expense: Expense dictionary with category, description, amount, frequency
            child_ids: List of child IDs
            petitioner_percentage: Split percentage for petitioner (parent_a)
            created_by: User ID
            months_ahead: Months to generate ahead

        Returns:
            Tuple of (template obligation, number of instances created)
        """
        # Extract expense details
        category = expense.get("category", "other")
        description = expense.get("description", "Recurring expense")
        amount = Decimal(str(expense.get("amount", 0)))
        frequency = expense.get("frequency", "monthly")
        due_day = expense.get("due_day", 1)

        if amount <= 0:
            logger.warning(f"Skipping expense template with zero or negative amount: {description}")
            return None, 0

        # Build recurrence rule
        recurrence_rule = self._build_recurrence_rule(frequency=frequency, due_day=due_day)

        # Calculate shares
        petitioner_share = amount * Decimal(petitioner_percentage) / 100
        respondent_share = amount - petitioner_share

        # Create template obligation
        template = Obligation(
            id=str(uuid.uuid4()),
            family_file_id=family_file.id,
            agreement_id=agreement.id,
            source_type="agreement",
            source_id=agreement.id,
            purpose_category=category,
            title=f"{description} - {frequency.capitalize()}",
            description=f"Recurring {description}. Created by ARIA based on agreement: {agreement.title}",
            child_ids=child_ids,
            total_amount=amount,
            petitioner_share=petitioner_share,
            respondent_share=respondent_share,
            petitioner_percentage=petitioner_percentage,
            split_from_agreement=True,
            status="template",
            is_recurring=True,
            recurrence_rule=recurrence_rule,
            verification_required=True,
            receipt_required=True,
            created_by=created_by,
        )

        self.db.add(template)
        await self.db.flush()

        # Generate instances
        instances_count = await self._generate_expense_instances(
            template=template,
            family_file=family_file,
            months_ahead=months_ahead
        )

        return template, instances_count

    async def _generate_expense_instances(
        self,
        template: Obligation,
        family_file: FamilyFile,
        months_ahead: int = 6
    ) -> int:
        """
        Generate obligation instances from a recurring expense template.

        Unlike child support (which has a specific payer), expense obligations
        create funding records for BOTH parents based on split ratio.

        Args:
            template: The template obligation with recurrence_rule
            family_file: The family file
            months_ahead: Number of months to generate ahead

        Returns:
            Number of instances created
        """
        # Get recurrence dates
        now = datetime.utcnow()
        end_date = now + relativedelta(months=months_ahead)
        dates = self._get_recurrence_dates(
            recurrence_rule=template.recurrence_rule,
            start_date=now,
            end_date=end_date
        )

        count = 0
        for due_date in dates:
            # Create instance obligation
            instance = Obligation(
                id=str(uuid.uuid4()),
                family_file_id=family_file.id,
                agreement_id=template.agreement_id,
                parent_obligation_id=template.id,
                source_type="agreement",
                source_id=template.agreement_id,
                purpose_category=template.purpose_category,
                title=f"{template.title} - {due_date.strftime('%B %Y')}",
                description=template.description,  # Inherit ARIA attribution
                child_ids=template.child_ids,
                total_amount=template.total_amount,
                petitioner_share=template.petitioner_share,
                respondent_share=template.respondent_share,
                petitioner_percentage=template.petitioner_percentage,
                split_from_agreement=True,
                due_date=due_date,
                status="open",
                is_recurring=False,
                verification_required=template.verification_required,
                receipt_required=template.receipt_required,
                created_by=template.created_by,
            )
            self.db.add(instance)
            await self.db.flush()

            # Create funding records for BOTH parents (split expense)
            if family_file.parent_a_id and template.petitioner_share > 0:
                funding_a = ObligationFunding(
                    id=str(uuid.uuid4()),
                    obligation_id=instance.id,
                    parent_id=family_file.parent_a_id,
                    amount_required=template.petitioner_share,
                    amount_funded=Decimal("0"),
                )
                self.db.add(funding_a)

            if family_file.parent_b_id and template.respondent_share > 0:
                funding_b = ObligationFunding(
                    id=str(uuid.uuid4()),
                    obligation_id=instance.id,
                    parent_id=family_file.parent_b_id,
                    amount_required=template.respondent_share,
                    amount_funded=Decimal("0"),
                )
                self.db.add(funding_b)

            count += 1

        await self.db.flush()
        return count
