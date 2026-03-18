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
    "logo": f"{_BASE}/logo-header.png",
    "welcome": f"{_BASE}/icon-welcome.png",
    "security": f"{_BASE}/icon-security.png",
    "lock": f"{_BASE}/icon-lock.png",
    "calendar": f"{_BASE}/icon-calendar.png",
    "agreement": f"{_BASE}/icon-agreement.png",
    "aria": f"{_BASE}/icon-aria.png",
    "clearfund": f"{_BASE}/icon-clearfund.png",
    "kidspace": f"{_BASE}/icon-kidspace.png",
    # Aliases for templates that use different names
    "message": f"{_BASE}/icon-welcome.png",
    "document": f"{_BASE}/icon-agreement.png",
    "video": f"{_BASE}/icon-kidspace.png",
    "money": f"{_BASE}/icon-clearfund.png",
    "family": f"{_BASE}/icon-welcome.png",
    "checkmark": f"{_BASE}/icon-agreement.png",
    "warning": f"{_BASE}/icon-security.png",
    "arrow_right": f"{_BASE}/icon-agreement.png",
    "report": f"{_BASE}/icon-agreement.png",
    "bell": f"{_BASE}/icon-security.png",
    "email_icon": f"{_BASE}/icon-welcome.png",
    "star": f"{_BASE}/icon-clearfund.png",
}
