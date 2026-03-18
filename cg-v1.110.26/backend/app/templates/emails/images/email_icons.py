"""
CommonGround Email Icons — Hosted on Supabase Storage

All icons are served from the public email-assets bucket.
Gmail, Outlook, and Apple Mail all support externally hosted images.
Base64 data URIs are NOT supported by Gmail, so we use hosted URLs.

Upload new assets with: python scripts/upload_email_assets.py
"""

_BASE = "https://mtcdoewgywxrlsogtmzi.supabase.co/storage/v1/object/public/email-assets"

# Dictionary for template access — {{ icons.logo }}, {{ icons.welcome }}, etc.
EMAIL_ICONS = {
    "logo": f"{_BASE}/logo-header.svg",
    "welcome": f"{_BASE}/icon-welcome.svg",
    "security": f"{_BASE}/icon-security.svg",
    "lock": f"{_BASE}/icon-lock.svg",
    "calendar": f"{_BASE}/icon-calendar.svg",
    "agreement": f"{_BASE}/icon-agreement.svg",
    "aria": f"{_BASE}/icon-aria.svg",
    "clearfund": f"{_BASE}/icon-clearfund.svg",
    "kidspace": f"{_BASE}/icon-kidspace.svg",
    # Aliases for templates that use different names
    "message": f"{_BASE}/icon-welcome.svg",
    "document": f"{_BASE}/icon-agreement.svg",
    "video": f"{_BASE}/icon-kidspace.svg",
    "money": f"{_BASE}/icon-clearfund.svg",
    "family": f"{_BASE}/icon-welcome.svg",
    "checkmark": f"{_BASE}/icon-agreement.svg",
    "warning": f"{_BASE}/icon-security.svg",
    "arrow_right": f"{_BASE}/icon-agreement.svg",
    "report": f"{_BASE}/icon-agreement.svg",
    "bell": f"{_BASE}/icon-security.svg",
    "email_icon": f"{_BASE}/icon-welcome.svg",
    "star": f"{_BASE}/icon-clearfund.svg",
}
