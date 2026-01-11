"""
Email notification service for sending transactional emails via SendGrid.
"""

import logging
from typing import Optional, List
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Service for sending email notifications via SendGrid.

    In development mode (EMAIL_ENABLED=False), emails are logged to console.
    In production (EMAIL_ENABLED=True), emails are sent via SendGrid API.
    """

    def __init__(self):
        """Initialize email service."""
        self.enabled = settings.EMAIL_ENABLED
        self.from_email = settings.FROM_EMAIL
        self.from_name = getattr(settings, 'FROM_NAME', 'CommonGround')
        self.api_key = settings.SENDGRID_API_KEY

        # Validate configuration
        if self.enabled and not self.api_key:
            logger.warning("EMAIL_ENABLED is True but SENDGRID_API_KEY is not set. Emails will be logged only.")
            self.enabled = False

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
        Send case invitation email.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            inviter_name: Name of person sending invitation
            case_name: Name of the case
            invitation_link: Link to accept invitation
            children_names: List of children's names

        Returns:
            Success status
        """
        subject = f"{inviter_name} invited you to collaborate on CommonGround"

        children_list = ", ".join(children_names) if children_names else "your children"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #6B8E6B 0%, #7A9F7A 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 28px; font-weight: 600; }}
                .header p {{ margin: 10px 0 0; opacity: 0.9; }}
                .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }}
                .button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #6B8E6B 0%, #7A9F7A 100%);
                    color: white;
                    padding: 14px 32px;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                    font-weight: 600;
                }}
                .feature-list {{ background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }}
                .feature-list li {{ margin: 8px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>CommonGround</h1>
                    <p>Co-Parenting Made Easier</p>
                </div>
                <div class="content">
                    <h2 style="margin-top: 0;">Hi {to_name},</h2>
                    <p><strong>{inviter_name}</strong> has invited you to collaborate on <strong>{case_name}</strong> regarding {children_list}.</p>

                    <div class="feature-list">
                        <p style="margin-top: 0; font-weight: 600;">CommonGround helps co-parents:</p>
                        <ul style="margin-bottom: 0;">
                            <li>Create custody agreements together</li>
                            <li>Communicate with AI-powered conflict prevention</li>
                            <li>Track parenting time and exchanges</li>
                            <li>Maintain objective records for court</li>
                        </ul>
                    </div>

                    <p style="text-align: center;">
                        <a href="{invitation_link}" class="button">Accept Invitation</a>
                    </p>

                    <p style="color: #666; font-size: 14px;"><em>This invitation link will expire in 7 days.</em></p>
                </div>
                <div class="footer">
                    <p style="margin: 0;">CommonGround - Where co-parents find common ground</p>
                    <p style="margin: 10px 0 0;">You received this email because {inviter_name} invited you to collaborate.</p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self._send_email(to_email, subject, html_body)

    async def send_agreement_approval_needed(
        self,
        to_email: str,
        to_name: str,
        case_name: str,
        agreement_title: str,
        approval_link: str
    ) -> bool:
        """
        Send notification that agreement needs approval.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            case_name: Name of the case
            agreement_title: Title of the agreement
            approval_link: Link to review and approve

        Returns:
            Success status
        """
        subject = f"Agreement ready for your approval: {agreement_title}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #D4A574 0%, #C4956A 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
                .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }}
                .button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #6B8E6B 0%, #7A9F7A 100%);
                    color: white;
                    padding: 14px 32px;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                    font-weight: 600;
                }}
                .agreement-box {{ background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #D4A574; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Agreement Ready for Approval</h1>
                </div>
                <div class="content">
                    <h2 style="margin-top: 0;">Hi {to_name},</h2>
                    <p>The parenting agreement for <strong>{case_name}</strong> is ready for your review and approval.</p>

                    <div class="agreement-box">
                        <p style="margin: 0;"><strong>Agreement:</strong> {agreement_title}</p>
                    </div>

                    <p>Please review the agreement carefully before approving. Once both parents approve, it will become active and can be used to generate your parenting schedule.</p>

                    <p style="text-align: center;">
                        <a href="{approval_link}" class="button">Review & Approve</a>
                    </p>
                </div>
                <div class="footer">
                    <p style="margin: 0;">CommonGround - Where co-parents find common ground</p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self._send_email(to_email, subject, html_body)

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

        aria_note = ""
        if was_flagged:
            aria_note = """
            <div style="background: #FEF3C7; padding: 15px; border-radius: 6px; border-left: 4px solid #F59E0B; margin: 15px 0;">
                <strong>ARIA Note:</strong> This message was reviewed by our AI assistant for tone to help maintain constructive communication.
            </div>
            """

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #6B8E6B 0%, #7A9F7A 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
                .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }}
                .message-preview {{
                    background: #f9fafb;
                    padding: 20px;
                    border-left: 4px solid #6B8E6B;
                    margin: 20px 0;
                    border-radius: 0 6px 6px 0;
                }}
                .button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #6B8E6B 0%, #7A9F7A 100%);
                    color: white;
                    padding: 14px 32px;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                    font-weight: 600;
                }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>New Message</h1>
                </div>
                <div class="content">
                    <h2 style="margin-top: 0;">Hi {to_name},</h2>
                    <p><strong>{sender_name}</strong> sent you a message regarding <strong>{case_name}</strong>.</p>

                    {aria_note}

                    <div class="message-preview">
                        <p style="margin: 0; color: #555;">{message_preview}...</p>
                    </div>

                    <p style="text-align: center;">
                        <a href="{message_link}" class="button">View Full Message</a>
                    </p>
                </div>
                <div class="footer">
                    <p style="margin: 0;">CommonGround - Where co-parents find common ground</p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self._send_email(to_email, subject, html_body)

    async def send_exchange_reminder(
        self,
        to_email: str,
        to_name: str,
        event_title: str,
        event_time: datetime,
        location: str,
        children_names: List[str],
        hours_before: int = 24
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

        Returns:
            Success status
        """
        time_label = f"{hours_before} hours" if hours_before > 1 else "1 hour"
        subject = f"Reminder: Exchange in {time_label}"

        time_str = event_time.strftime("%A, %B %d at %I:%M %p")
        children_list = ", ".join(children_names) if children_names else "your children"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #6B8E6B 0%, #7A9F7A 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
                .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }}
                .event-details {{
                    background: #f9fafb;
                    padding: 20px;
                    border-left: 4px solid #6B8E6B;
                    margin: 20px 0;
                    border-radius: 0 6px 6px 0;
                }}
                .event-details p {{ margin: 8px 0; }}
                .tip {{ background: #EFF6FF; padding: 15px; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Exchange Reminder</h1>
                </div>
                <div class="content">
                    <h2 style="margin-top: 0;">Hi {to_name},</h2>
                    <p>This is a reminder about your upcoming parenting time exchange.</p>

                    <div class="event-details">
                        <p><strong>Event:</strong> {event_title}</p>
                        <p><strong>When:</strong> {time_str}</p>
                        <p><strong>Where:</strong> {location}</p>
                        <p><strong>Children:</strong> {children_list}</p>
                    </div>

                    <div class="tip">
                        <strong>Tip:</strong> Check in when you arrive to maintain your on-time compliance record.
                    </div>
                </div>
                <div class="footer">
                    <p style="margin: 0;">CommonGround - Where co-parents find common ground</p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self._send_email(to_email, subject, html_body)

    async def send_compliance_report(
        self,
        to_email: str,
        to_name: str,
        case_name: str,
        on_time_rate: float,
        total_exchanges: int,
        report_link: str
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

        Returns:
            Success status
        """
        subject = f"Monthly Compliance Report - {case_name}"

        on_time_pct = int(on_time_rate * 100)

        # Determine status color
        if on_time_pct >= 90:
            status_color = "#10B981"  # Green
            status_text = "Excellent"
        elif on_time_pct >= 70:
            status_color = "#F59E0B"  # Amber
            status_text = "Good"
        else:
            status_color = "#EF4444"  # Red
            status_text = "Needs Improvement"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #6B8E6B 0%, #7A9F7A 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
                .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }}
                .stats {{ display: flex; gap: 20px; margin: 20px 0; }}
                .stat {{
                    flex: 1;
                    background: #f9fafb;
                    padding: 20px;
                    text-align: center;
                    border-radius: 8px;
                }}
                .stat h3 {{ margin: 0; font-size: 32px; }}
                .stat p {{ margin: 5px 0 0; color: #666; font-size: 14px; }}
                .button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #6B8E6B 0%, #7A9F7A 100%);
                    color: white;
                    padding: 14px 32px;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                    font-weight: 600;
                }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Monthly Compliance Report</h1>
                </div>
                <div class="content">
                    <h2 style="margin-top: 0;">Hi {to_name},</h2>
                    <p>Here's your monthly compliance summary for <strong>{case_name}</strong>.</p>

                    <div class="stats">
                        <div class="stat">
                            <h3 style="color: {status_color};">{on_time_pct}%</h3>
                            <p>On-Time Rate</p>
                            <p style="color: {status_color}; font-weight: 600;">{status_text}</p>
                        </div>
                        <div class="stat">
                            <h3 style="color: #6B8E6B;">{total_exchanges}</h3>
                            <p>Total Exchanges</p>
                        </div>
                    </div>

                    <p style="text-align: center;">
                        <a href="{report_link}" class="button">View Full Report</a>
                    </p>

                    <p style="color: #666; font-size: 13px; text-align: center;"><em>These metrics are court-admissible and demonstrate good faith compliance.</em></p>
                </div>
                <div class="footer">
                    <p style="margin: 0;">CommonGround - Where co-parents find common ground</p>
                </div>
            </div>
        </body>
        </html>
        """

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

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
                .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }}
                .button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
                    color: white;
                    padding: 14px 32px;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                    font-weight: 600;
                }}
                .feature-list {{ background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }}
                .feature-list li {{ margin: 8px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>My Circle Invitation</h1>
                </div>
                <div class="content">
                    <h2 style="margin-top: 0;">Hi {to_name},</h2>
                    <p><strong>{inviter_name}</strong> has invited you to join <strong>{child_name}'s</strong> Circle as their <strong>{relationship}</strong>.</p>

                    <div class="feature-list">
                        <p style="margin-top: 0; font-weight: 600;">As a Circle member, you can:</p>
                        <ul style="margin-bottom: 0;">
                            <li>Video call with {child_name} (with parental approval)</li>
                            <li>Send monitored messages</li>
                            <li>Stay connected with your family</li>
                        </ul>
                    </div>

                    <p style="text-align: center;">
                        <a href="{invitation_link}" class="button">Accept Invitation</a>
                    </p>

                    <p style="color: #666; font-size: 14px;"><em>This invitation link will expire in 7 days.</em></p>
                </div>
                <div class="footer">
                    <p style="margin: 0;">CommonGround - Where co-parents find common ground</p>
                    <p style="margin: 10px 0 0;">You received this email because {inviter_name} invited you to join their family's Circle.</p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self._send_email(to_email, subject, html_body)

    async def send_kidcoms_call_notification(
        self,
        to_email: str,
        to_name: str,
        caller_name: str,
        child_name: str,
        call_link: str
    ) -> bool:
        """
        Send notification about incoming KidComs call.

        Args:
            to_email: Recipient email
            to_name: Recipient name
            caller_name: Name of person calling
            child_name: Name of child involved
            call_link: Link to join call

        Returns:
            Success status
        """
        subject = f"{caller_name} is calling on CommonGround"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
                .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; text-align: center; }}
                .button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                    color: white;
                    padding: 16px 40px;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                    font-weight: 600;
                    font-size: 18px;
                }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; background: #f9fafb; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Incoming Call</h1>
                </div>
                <div class="content">
                    <h2 style="margin-top: 0;">Hi {to_name},</h2>
                    <p style="font-size: 18px;"><strong>{caller_name}</strong> is trying to reach <strong>{child_name}</strong> on KidComs.</p>

                    <p>
                        <a href="{call_link}" class="button">Join Call</a>
                    </p>

                    <p style="color: #666; font-size: 14px;">If you can't join now, the caller will be notified.</p>
                </div>
                <div class="footer">
                    <p style="margin: 0;">CommonGround KidComs - Safe communication for families</p>
                </div>
            </div>
        </body>
        </html>
        """

        return await self._send_email(to_email, subject, html_body)

    async def _send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None
    ) -> bool:
        """
        Send email via SendGrid or log in development mode.

        Args:
            to_email: Recipient email
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text fallback (auto-generated if not provided)

        Returns:
            Success status
        """
        # Development mode - log to console
        if not self.enabled:
            logger.info(f"[EMAIL DEV MODE] To: {to_email} | Subject: {subject}")
            print(f"\n{'='*60}")
            print(f"EMAIL (Development Mode - Not Sent)")
            print(f"{'='*60}")
            print(f"To: {to_email}")
            print(f"From: {self.from_name} <{self.from_email}>")
            print(f"Subject: {subject}")
            print(f"{'='*60}\n")
            return True

        # Production mode - send via SendGrid
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, Email, To, Content

            message = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_body)
            )

            sg = SendGridAPIClient(self.api_key)
            response = sg.send(message)

            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to_email}: {subject}")
                return True
            else:
                logger.error(f"SendGrid returned status {response.status_code} for {to_email}")
                return False

        except ImportError:
            logger.error("SendGrid library not installed. Run: pip install sendgrid")
            return False
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False


# Create a singleton instance
email_service = EmailService()
