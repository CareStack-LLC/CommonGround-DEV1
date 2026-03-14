"""
Email notification service for sending transactional emails via SendGrid.

Uses Jinja2 templates for consistent, branded email rendering.
"""

import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings
from app.templates.emails.images.email_icons import EMAIL_ICONS

logger = logging.getLogger(__name__)

# Template directory
TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "emails"


class EmailService:
    """
    Service for sending email notifications via SendGrid.

    In development mode (EMAIL_ENABLED=False), emails are logged to console.
    In production (EMAIL_ENABLED=True), emails are sent via SendGrid API.

    Uses Jinja2 templates from backend/app/templates/emails/ for rendering.
    """

    def __init__(self):
        """Initialize email service with Jinja2 environment."""
        self.enabled = settings.EMAIL_ENABLED
        self.from_email = settings.FROM_EMAIL
        self.from_name = getattr(settings, 'FROM_NAME', 'CommonGround')
        self.api_key = settings.SENDGRID_API_KEY
        self.frontend_url = getattr(settings, 'FRONTEND_URL', 'https://common-ground-blue.vercel.app')

        # Validate configuration
        if self.enabled and not self.api_key:
            logger.warning("EMAIL_ENABLED is True but SENDGRID_API_KEY is not set. Emails will be logged only.")
            self.enabled = False

        # Initialize Jinja2 environment
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=select_autoescape(['html', 'xml']),
            trim_blocks=True,
            lstrip_blocks=True
        )

    def _render_template(self, template_path: str, context: Dict[str, Any]) -> str:
        """
        Render a Jinja2 email template with the given context.

        Args:
            template_path: Path to template relative to emails directory (e.g., 'onboarding/welcome.html')
            context: Dictionary of variables to pass to the template

        Returns:
            Rendered HTML string
        """
        # Always include icons in context
        context.setdefault('icons', EMAIL_ICONS)
        context.setdefault('frontend_url', self.frontend_url)
        context.setdefault('current_year', datetime.now().year)

        template = self.jinja_env.get_template(template_path)
        return template.render(**context)

    # ==================== Onboarding Emails ====================

    async def send_welcome_email(
        self,
        to_email: str,
        user_name: str,
        dashboard_url: Optional[str] = None
    ) -> bool:
        """
        Send welcome email to new users.

        Args:
            to_email: Recipient email
            user_name: User's name
            dashboard_url: Link to dashboard

        Returns:
            Success status
        """
        subject = "Welcome to CommonGround"

        html_body = self._render_template('onboarding/welcome.html', {
            'user_name': user_name,
            'dashboard_url': dashboard_url or f"{self.frontend_url}/dashboard"
        })

        return await self._send_email(to_email, subject, html_body)

    async def send_getting_started_email(
        self,
        to_email: str,
        user_name: str,
        completed_steps: List[str],
        total_steps: int = 5,
        continue_url: Optional[str] = None
    ) -> bool:
        """
        Send getting started guide email.

        Args:
            to_email: Recipient email
            user_name: User's name
            completed_steps: List of completed step names
            total_steps: Total number of steps
            continue_url: Link to continue setup

        Returns:
            Success status
        """
        subject = "Complete Your CommonGround Setup"

        html_body = self._render_template('onboarding/getting_started.html', {
            'user_name': user_name,
            'completed_steps': completed_steps,
            'total_steps': total_steps,
            'progress_percent': int((len(completed_steps) / total_steps) * 100),
            'continue_url': continue_url or f"{self.frontend_url}/setup"
        })

        return await self._send_email(to_email, subject, html_body)

    # ==================== Invitation Emails ====================

    async def send_case_invitation(
        self,
        to_email: str,
        to_name: str,
        inviter_name: str,
        case_name: str,
        invitation_link: str,
        children_names: List[str]
    ) -> bool:
        """
        Send co-parent invitation email.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            inviter_name: Name of person sending invitation
            case_name: Name of the case/family file
            invitation_link: Link to accept invitation
            children_names: List of children's names

        Returns:
            Success status
        """
        subject = f"{inviter_name} invited you to collaborate on CommonGround"

        html_body = self._render_template('invitations/parent_invite.html', {
            'to_name': to_name,
            'inviter_name': inviter_name,
            'family_file_name': case_name,
            'invitation_link': invitation_link,
            'children_names': children_names,
            'expiry_days': 7
        })

        return await self._send_email(to_email, subject, html_body)

    async def send_professional_invitation(
        self,
        to_email: str,
        to_name: str,
        inviter_name: str,
        case_name: str,
        invitation_link: str,
        role: str,
        access_description: str,
        case_reference: Optional[str] = None
    ) -> bool:
        """
        Send professional (GAL/mediator/attorney) invitation email.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            inviter_name: Name of person sending invitation
            case_name: Name of the case
            invitation_link: Link to accept invitation
            role: Professional role (e.g., 'Guardian ad Litem', 'Mediator')
            access_description: Description of access level
            case_reference: Court case reference number

        Returns:
            Success status
        """
        subject = f"Professional Access Request - {case_name}"

        html_body = self._render_template('invitations/professional_invite.html', {
            'to_name': to_name,
            'inviter_name': inviter_name,
            'family_file_name': case_name,
            'invitation_link': invitation_link,
            'role': role,
            'access_description': access_description,
            'case_reference': case_reference,
            'expiry_days': 7
        })

        return await self._send_email(to_email, subject, html_body)

    async def send_circle_invitation(
        self,
        to_email: str,
        to_name: str,
        inviter_name: str,
        child_name: str,
        invitation_link: str,
        relationship: str
    ) -> bool:
        """
        Send My Circle invitation email.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            inviter_name: Name of parent sending invitation
            child_name: Name of the child
            invitation_link: Link to accept invitation
            relationship: Relationship to child (grandparent, aunt, etc.)

        Returns:
            Success status
        """
        subject = f"{inviter_name} invited you to connect with {child_name} on CommonGround"

        html_body = self._render_template('invitations/circle_invite.html', {
            'to_name': to_name,
            'inviter_name': inviter_name,
            'child_name': child_name,
            'invitation_link': invitation_link,
            'relationship': relationship,
            'expiry_days': 7
        })

        return await self._send_email(to_email, subject, html_body)

    # ==================== Notification Emails ====================

    async def send_message_notification(
        self,
        to_email: str,
        to_name: str,
        sender_name: str,
        case_name: str,
        message_preview: str,
        message_link: str,
        was_flagged: bool = False
    ) -> bool:
        """
        Send notification about new message.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            sender_name: Name of message sender
            case_name: Name of the case
            message_preview: First 100 chars of message
            message_link: Link to view message
            was_flagged: Whether ARIA flagged the message

        Returns:
            Success status
        """
        subject = f"New message from {sender_name}"

        html_body = self._render_template('notifications/message_received.html', {
            'to_name': to_name,
            'sender_name': sender_name,
            'family_file_name': case_name,
            'message_preview': message_preview,
            'message_url': message_link,
            'aria_reviewed': was_flagged,
            'sent_time': datetime.now().strftime('%B %d at %I:%M %p')
        })

        return await self._send_email(to_email, subject, html_body)

    async def send_agreement_approval_needed(
        self,
        to_email: str,
        to_name: str,
        case_name: str,
        agreement_title: str,
        approval_link: str,
        other_parent_name: Optional[str] = None,
        sections_updated: Optional[List[str]] = None
    ) -> bool:
        """
        Send notification that agreement needs approval.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            case_name: Name of the case
            agreement_title: Title of the agreement
            approval_link: Link to review and approve
            other_parent_name: Name of other parent who updated
            sections_updated: List of updated section names

        Returns:
            Success status
        """
        subject = f"Agreement ready for your approval: {agreement_title}"

        html_body = self._render_template('notifications/agreement_approval.html', {
            'to_name': to_name,
            'family_file_name': case_name,
            'agreement_title': agreement_title,
            'review_url': approval_link,
            'requester_name': other_parent_name,
            'sections_updated': sections_updated,
            'deadline': (datetime.now().replace(day=datetime.now().day + 7)).strftime('%B %d, %Y')
        })

        return await self._send_email(to_email, subject, html_body)

    async def send_agreement_finalized(
        self,
        to_email: str,
        to_name: str,
        case_name: str,
        agreement_title: str,
        agreement_url: str,
        parent_a_name: str,
        parent_b_name: str,
        effective_date: Optional[str] = None
    ) -> bool:
        """
        Send notification that agreement has been finalized.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            case_name: Name of the case
            agreement_title: Title of the agreement
            agreement_url: Link to view agreement
            parent_a_name: Name of parent A
            parent_b_name: Name of parent B
            effective_date: When agreement takes effect

        Returns:
            Success status
        """
        subject = f"Agreement Finalized: {agreement_title}"

        html_body = self._render_template('notifications/agreement_finalized.html', {
            'to_name': to_name,
            'family_file_name': case_name,
            'agreement_title': agreement_title,
            'agreement_url': agreement_url,
            'parent_a_name': parent_a_name,
            'parent_b_name': parent_b_name,
            'effective_date': effective_date or 'Immediately'
        })

        return await self._send_email(to_email, subject, html_body)

    async def send_exchange_reminder(
        self,
        to_email: str,
        to_name: str,
        event_title: str,
        event_time: datetime,
        location: str,
        children_names: List[str],
        hours_before: int = 24,
        exchange_url: Optional[str] = None,
        location_url: Optional[str] = None
    ) -> bool:
        """
        Send reminder about upcoming exchange.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            event_title: Title of the event
            event_time: Time of the exchange
            location: Exchange location
            children_names: List of children involved
            hours_before: How many hours before (for subject)
            exchange_url: Link to view exchange details
            location_url: Map link for location

        Returns:
            Success status
        """
        time_label = "tomorrow" if hours_before >= 24 else f"in {hours_before} hours"
        subject = f"Reminder: Exchange {time_label}"

        html_body = self._render_template('notifications/exchange_reminder.html', {
            'to_name': to_name,
            'time_label': time_label,
            'exchange_date': event_time.strftime('%A, %B %d, %Y'),
            'exchange_time': event_time.strftime('%I:%M %p'),
            'location': location,
            'location_url': location_url,
            'children_names': children_names,
            'exchange_url': exchange_url or f"{self.frontend_url}/schedule"
        })

        return await self._send_email(to_email, subject, html_body)

    async def send_kidcoms_call_notification(
        self,
        to_email: str,
        to_name: str,
        caller_name: str,
        child_name: str,
        call_link: str,
        caller_relationship: Optional[str] = None
    ) -> bool:
        """
        Send notification about incoming KidComs call.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            caller_name: Name of person calling
            child_name: Name of child involved
            call_link: Link to join call
            caller_relationship: Relationship to child

        Returns:
            Success status
        """
        subject = f"{caller_name} is calling on CommonGround"

        html_body = self._render_template('notifications/kidcoms_call.html', {
            'to_name': to_name,
            'caller_name': caller_name,
            'child_name': child_name,
            'call_url': call_link,
            'caller_relationship': caller_relationship
        })

        return await self._send_email(to_email, subject, html_body)

    # ==================== Report Emails ====================

    async def send_report_ready(
        self,
        to_email: str,
        to_name: str,
        report_type: str,
        date_range: str,
        family_file_name: str,
        download_url: str,
        highlights: Optional[List[Dict[str, str]]] = None,
        expiry_date: Optional[str] = None
    ) -> bool:
        """
        Send notification that a report is ready for download.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            report_type: Type of report (e.g., 'Custody Time', 'Communication')
            date_range: Date range covered
            family_file_name: Name of family file
            download_url: Link to download report
            highlights: List of dicts with 'label' and 'value' keys
            expiry_date: When download link expires

        Returns:
            Success status
        """
        subject = f"Your {report_type} Report is Ready"

        html_body = self._render_template('reports/report_ready.html', {
            'to_name': to_name,
            'report_type': report_type,
            'date_range': date_range,
            'family_file_name': family_file_name,
            'download_url': download_url,
            'highlights': highlights,
            'expiry_date': expiry_date
        })

        return await self._send_email(to_email, subject, html_body)

    async def send_compliance_report(
        self,
        to_email: str,
        to_name: str,
        case_name: str,
        on_time_rate: float,
        total_exchanges: int,
        report_link: str,
        month_name: Optional[str] = None,
        year: Optional[int] = None,
        on_time_count: Optional[int] = None,
        completed_exchanges: Optional[int] = None,
        missed_exchanges: Optional[int] = None,
        gps_verified_count: Optional[int] = None,
        message_count: Optional[int] = None
    ) -> bool:
        """
        Send monthly compliance report.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            case_name: Name of the case
            on_time_rate: Percentage on-time (0-1)
            total_exchanges: Total number of exchanges
            report_link: Link to full report
            month_name: Month name for report
            year: Year for report
            on_time_count: Number of on-time exchanges
            completed_exchanges: Number of completed exchanges
            missed_exchanges: Number of missed exchanges
            gps_verified_count: Number of GPS verified check-ins
            message_count: Number of messages exchanged

        Returns:
            Success status
        """
        now = datetime.now()
        subject = f"Monthly Compliance Report - {case_name}"

        html_body = self._render_template('reports/compliance_monthly.html', {
            'to_name': to_name,
            'family_file_name': case_name,
            'compliance_rate': int(on_time_rate * 100),
            'total_exchanges': total_exchanges,
            'full_report_url': report_link,
            'month_name': month_name or now.strftime('%B'),
            'year': year or now.year,
            'on_time_count': on_time_count or int(total_exchanges * on_time_rate),
            'completed_exchanges': completed_exchanges or total_exchanges,
            'missed_exchanges': missed_exchanges or 0,
            'gps_verified_count': gps_verified_count or 0,
            'message_count': message_count or 0
        })

        return await self._send_email(to_email, subject, html_body)

    # ==================== ClearFund Emails ====================

    async def send_expense_request(
        self,
        to_email: str,
        to_name: str,
        requester_name: str,
        expense_title: str,
        expense_category: str,
        total_amount: float,
        your_share: float,
        your_percentage: int,
        approve_url: str,
        expense_description: Optional[str] = None,
        receipt_attached: bool = False,
        children_names: Optional[List[str]] = None,
        deadline: Optional[str] = None
    ) -> bool:
        """
        Send expense request notification.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            requester_name: Name of person requesting
            expense_title: Title/description of expense
            expense_category: Category (medical, education, etc.)
            total_amount: Total expense amount
            your_share: Recipient's share to pay
            your_percentage: Recipient's percentage
            approve_url: Link to approve/review
            expense_description: Detailed description
            receipt_attached: Whether receipt was attached
            children_names: Children this expense is for
            deadline: Response deadline

        Returns:
            Success status
        """
        subject = f"Expense Request: {expense_title}"

        html_body = self._render_template('clearfund/expense_request.html', {
            'to_name': to_name,
            'requester_name': requester_name,
            'expense_title': expense_title,
            'expense_category': expense_category,
            'total_amount': total_amount,
            'your_share': your_share,
            'your_percentage': your_percentage,
            'approve_url': approve_url,
            'expense_description': expense_description,
            'receipt_attached': receipt_attached,
            'children_names': children_names,
            'deadline': deadline
        })

        return await self._send_email(to_email, subject, html_body)

    async def send_expense_approved(
        self,
        to_email: str,
        to_name: str,
        expense_title: str,
        expense_category: str,
        total_amount: float,
        approver_name: str,
        approved_date: str,
        expense_url: str,
        parent_a_name: str,
        parent_a_amount: float,
        parent_a_percentage: int,
        parent_b_name: str,
        parent_b_amount: float,
        parent_b_percentage: int,
        receipt_url: Optional[str] = None
    ) -> bool:
        """
        Send expense approval notification.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            expense_title: Title of expense
            expense_category: Category
            total_amount: Total amount
            approver_name: Who approved
            approved_date: When approved
            expense_url: Link to expense details
            parent_a_name: Parent A name
            parent_a_amount: Parent A share
            parent_a_percentage: Parent A percentage
            parent_b_name: Parent B name
            parent_b_amount: Parent B share
            parent_b_percentage: Parent B percentage
            receipt_url: Link to receipt

        Returns:
            Success status
        """
        subject = f"Expense Approved: {expense_title}"

        html_body = self._render_template('clearfund/expense_approved.html', {
            'to_name': to_name,
            'expense_title': expense_title,
            'expense_category': expense_category,
            'total_amount': total_amount,
            'approver_name': approver_name,
            'approved_date': approved_date,
            'expense_url': expense_url,
            'parent_a_name': parent_a_name,
            'parent_a_amount': parent_a_amount,
            'parent_a_percentage': parent_a_percentage,
            'parent_b_name': parent_b_name,
            'parent_b_amount': parent_b_amount,
            'parent_b_percentage': parent_b_percentage,
            'receipt_url': receipt_url
        })

        return await self._send_email(to_email, subject, html_body)

    async def send_payment_reminder(
        self,
        to_email: str,
        to_name: str,
        amount_due: float,
        due_date: str,
        payment_url: str,
        is_overdue: bool = False,
        outstanding_items: Optional[List[Dict[str, Any]]] = None
    ) -> bool:
        """
        Send payment reminder notification.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            amount_due: Total amount due
            due_date: Payment due date
            payment_url: Link to make payment
            is_overdue: Whether payment is past due
            outstanding_items: List of outstanding expenses

        Returns:
            Success status
        """
        subject = f"Payment Reminder: ${amount_due:.2f} Due"
        if is_overdue:
            subject = f"Overdue Payment: ${amount_due:.2f}"

        html_body = self._render_template('clearfund/payment_reminder.html', {
            'to_name': to_name,
            'amount_due': amount_due,
            'due_date': due_date,
            'payment_url': payment_url,
            'is_overdue': is_overdue,
            'outstanding_items': outstanding_items or []
        })

        return await self._send_email(to_email, subject, html_body)

    # ==================== Attorney-Branded Invitation Emails (GTM Fix #1) ====================

    async def send_attorney_case_invitation(
        self,
        to_email: str,
        to_name: str,
        inviter_name: str,
        family_file_title: str,
        magic_link: str,
        children_names: List[str],
        attorney_name: Optional[str] = None,
        attorney_firm: Optional[str] = None,
        from_name_override: Optional[str] = None,
        is_resend: bool = False,
    ) -> Optional[str]:
        """
        Send attorney-branded case invitation with magic link.

        Fix #1: Attorney name shows in From field for 70%+ open rates.
        Fix #2: Magic link for one-tap activation.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            inviter_name: Attorney or parent name
            family_file_title: Family file title
            magic_link: One-tap activation URL
            children_names: Children's names
            attorney_name: Attorney name for branding
            attorney_firm: Attorney firm for branding
            from_name_override: Custom From Name for SendGrid
            is_resend: Whether this is a follow-up resend

        Returns:
            SendGrid message ID for tracking, or None
        """
        if is_resend:
            subject = f"Reminder: {inviter_name} is waiting for you on CommonGround"
        elif attorney_name:
            subject = f"{attorney_name} has set up CommonGround for your family"
        else:
            subject = f"{inviter_name} invited you to CommonGround"

        # Build branded HTML
        firm_line = f"<p style='color: #64748b; font-size: 14px; margin: 0;'>{attorney_firm}</p>" if attorney_firm else ""
        children_section = ""
        if children_names:
            names = ", ".join(children_names)
            children_section = f"""
            <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #1e3a4a; font-size: 14px;">
                    <strong>Children:</strong> {names}
                </p>
            </div>
            """

        resend_note = ""
        if is_resend:
            resend_note = """
            <div style="background: #fef3c7; border-radius: 8px; padding: 12px; margin: 16px 0;">
                <p style="margin: 0; color: #92400e; font-size: 13px;">
                    This is a friendly reminder. Your invitation is still waiting.
                </p>
            </div>
            """

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>You're Invited to CommonGround</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
            <div style="background: linear-gradient(135deg, #1E3A4A 0%, #2D6A8F 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 24px;">CommonGround</h1>
                <p style="color: #5BC4A0; margin: 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Co-Parenting, Reimagined</p>
            </div>

            <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="margin-top: 0; font-size: 16px;">Hi {to_name},</p>

                {resend_note}

                <p><strong>{inviter_name}</strong> has invited you to use CommonGround — a secure platform designed to make co-parenting communication easier, more organized, and focused on what matters most: your children.</p>

                {children_section}

                <p>CommonGround helps you:</p>
                <ul style="color: #475569; padding-left: 20px;">
                    <li>Communicate with AI-assisted message guidance</li>
                    <li>Track schedules and custody exchanges</li>
                    <li>Manage shared expenses transparently</li>
                    <li>Build agreements that work for everyone</li>
                </ul>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{magic_link}" style="display: inline-block; background: linear-gradient(135deg, #3DAA8A, #5BC4A0); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 8px rgba(61, 170, 138, 0.3);">
                        Get Started — It's Free
                    </a>
                </div>

                <p style="color: #64748b; font-size: 13px; text-align: center;">One tap to activate. No password needed.</p>

                {firm_line}

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

                <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
                    This invitation expires in 7 days. If you have questions, reply to this email or contact support at support@find-commonground.com.
                </p>
            </div>
        </body>
        </html>
        """

        return await self._send_email(
            to_email,
            subject,
            html_body,
            from_name_override=from_name_override,
        )

    # ==================== Auth Emails ====================

    async def send_security_alert(
        self,
        to_email: str,
        to_name: str,
        alert_type: str,
        alert_message: str,
        secure_account_url: str,
        event_timestamp: str,
        device_info: Optional[str] = None,
        location: Optional[str] = None,
        ip_address: Optional[str] = None,
        is_critical: bool = False,
        alert_description: Optional[str] = None
    ) -> bool:
        """
        Send security alert notification.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            alert_type: Type of alert (new login, password change, etc.)
            alert_message: Detailed alert message
            secure_account_url: Link to secure account
            event_timestamp: When event occurred
            device_info: Device information
            location: Geographic location
            ip_address: IP address
            is_critical: Whether alert is critical
            alert_description: Short description for intro

        Returns:
            Success status
        """
        subject = f"Security Alert: {alert_type}"

        html_body = self._render_template('auth/security_alert.html', {
            'to_name': to_name,
            'alert_type': alert_type,
            'alert_message': alert_message,
            'secure_account_url': secure_account_url,
            'event_timestamp': event_timestamp,
            'device_info': device_info,
            'location': location,
            'ip_address': ip_address,
            'is_critical': is_critical,
            'alert_description': alert_description
        })

        return await self._send_email(to_email, subject, html_body)

    async def send_password_reset(
        self,
        to_email: str,
        to_name: str,
        reset_link: str
    ) -> bool:
        """
        Send password reset email.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            reset_link: Link to reset password

        Returns:
            Success status
        """
        subject = "Reset Your CommonGround Password"

        # Simple HTML email for password reset
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #4A6C58 0%, #3d5a4a 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="margin-top: 0;">Hi {to_name},</p>
                <p>We received a request to reset your My Circle password. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="display: inline-block; background: #4A6C58; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
                </div>
                <p style="color: #64748b; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
                <p style="color: #64748b; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">This email was sent by CommonGround. If you have questions, please contact support.</p>
            </div>
        </body>
        </html>
        """

        return await self._send_email(to_email, subject, html_body)

    # ==================== Marketing Emails ====================

    async def send_newsletter_welcome(self, to_email: str) -> bool:
        """
        Send welcome email to new newsletter subscriber.

        Args:
            to_email: Subscriber email address

        Returns:
            Success status
        """
        subject = "Welcome to the CommonGround Newsletter!"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to CommonGround</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
            <div style="background: linear-gradient(135deg, #1E3A4A 0%, #2D6A8F 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 24px;">CommonGround</h1>
                <p style="color: #5BC4A0; margin: 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Co-Parenting, Reimagined</p>
            </div>

            <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <h2 style="margin-top: 0; color: #1E3A4A;">You're on the list!</h2>

                <p>Thanks for subscribing to the CommonGround newsletter. We're glad to have you.</p>

                <p>Here's what you can expect:</p>
                <ul style="color: #475569; padding-left: 20px;">
                    <li>Co-parenting tips and insights</li>
                    <li>Platform updates and new features</li>
                    <li>Resources for healthier family communication</li>
                    <li>Stories from the CommonGround community</li>
                </ul>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{self.frontend_url}" style="display: inline-block; background: linear-gradient(135deg, #3DAA8A, #5BC4A0); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Visit CommonGround
                    </a>
                </div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

                <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
                    You received this email because you subscribed to the CommonGround newsletter.
                    If you no longer wish to receive these emails, you can unsubscribe at any time.
                </p>
            </div>
        </body>
        </html>
        """

        return await self._send_email(to_email, subject, html_body)

    async def send_contact_form_notification(
        self,
        name: str,
        email: str,
        inquiry_type: str,
        subject: Optional[str],
        message: str,
        internal_email: str,
    ) -> bool:
        """
        Send contact form contents to the appropriate internal team email.

        Args:
            name: Submitter's name
            email: Submitter's email
            inquiry_type: Type of inquiry
            subject: Optional subject line
            message: Message body
            internal_email: Internal email address to route to

        Returns:
            Success status
        """
        email_subject = f"Contact Form: {subject or inquiry_type.capitalize() + ' Inquiry'} from {name}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Contact Form Submission</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1E3A4A; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px;">New Contact Form Submission</h1>
            </div>

            <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                    <tr>
                        <td style="padding: 8px 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #f1f5f9; width: 120px;">Name</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">{name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #f1f5f9;">Email</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;"><a href="mailto:{email}">{email}</a></td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #f1f5f9;">Type</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">{inquiry_type.capitalize()}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #f1f5f9;">Subject</td>
                        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">{subject or 'N/A'}</td>
                    </tr>
                </table>

                <h3 style="color: #1E3A4A; margin-bottom: 8px;">Message</h3>
                <div style="background: #f8fafc; border-radius: 8px; padding: 16px; white-space: pre-wrap;">{message}</div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
                <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
                    This message was submitted via the CommonGround contact form.
                </p>
            </div>
        </body>
        </html>
        """

        return await self._send_email(internal_email, email_subject, html_body)

    async def send_contact_form_confirmation(self, to_email: str, name: str) -> bool:
        """
        Send confirmation email to contact form submitter.

        Args:
            to_email: Submitter's email
            name: Submitter's name

        Returns:
            Success status
        """
        subject = "We received your message — CommonGround"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Message Received</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
            <div style="background: linear-gradient(135deg, #1E3A4A 0%, #2D6A8F 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0 0 8px 0; font-family: Georgia, serif; font-size: 24px;">CommonGround</h1>
                <p style="color: #5BC4A0; margin: 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Co-Parenting, Reimagined</p>
            </div>

            <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <p style="margin-top: 0;">Hi {name},</p>

                <p>Thank you for reaching out to CommonGround. We've received your message and a member of our team will get back to you within 1-2 business days.</p>

                <p>In the meantime, feel free to explore our platform or check out our resources:</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{self.frontend_url}" style="display: inline-block; background: linear-gradient(135deg, #3DAA8A, #5BC4A0); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Visit CommonGround
                    </a>
                </div>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

                <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
                    This is an automated confirmation. Please do not reply directly to this email.
                    If you need immediate assistance, contact us at support@find-commonground.com.
                </p>
            </div>
        </body>
        </html>
        """

        return await self._send_email(to_email, subject, html_body)

    # ==================== Internal Methods ====================

    async def _send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        from_name_override: Optional[str] = None,
    ) -> Optional[str]:
        """
        Send email via SendGrid or log in development mode.

        Args:
            to_email: Recipient email
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text fallback (auto-generated if not provided)
            from_name_override: Custom From Name (e.g., "Jane Smith via CommonGround")

        Returns:
            SendGrid message ID for tracking, or True/False for dev mode
        """
        sender_name = from_name_override or self.from_name

        # Development mode - log to console
        if not self.enabled:
            logger.info(f"[EMAIL DEV MODE] To: {to_email} | Subject: {subject}")
            print(f"\n{'='*60}")
            print(f"EMAIL (Development Mode - Not Sent)")
            print(f"{'='*60}")
            print(f"To: {to_email}")
            print(f"From: {sender_name} <{self.from_email}>")
            print(f"Subject: {subject}")
            print(f"{'='*60}\n")
            return None

        # Production mode - send via SendGrid
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Email, To, Content

            message = Mail(
                from_email=Email(self.from_email, sender_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_body)
            )

            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)

            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to_email}: {subject}")
                # Extract message ID from response headers for tracking
                msg_id = response.headers.get("X-Message-Id")
                return msg_id
            else:
                logger.error(f"SendGrid returned status {response.status_code} for {to_email}")
                return None

        except ImportError:
            logger.error("SendGrid library not installed. Run: pip install sendgrid")
            return None
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return None


# Create a singleton instance
email_service = EmailService()
