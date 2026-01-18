"""
CommonGround Email Icons - Base64 Encoded SVGs

These icons are designed for inline embedding in HTML emails.
Use the DATA_URI constants directly in img src attributes.
"""

import base64

# SVG Icon Definitions
_ICONS = {
    "logo": '''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50" viewBox="0 0 200 50">
  <circle cx="25" cy="25" r="22" fill="none" stroke="#4A6C58" stroke-width="3"/>
  <circle cx="25" cy="25" r="14" fill="none" stroke="#4A6C58" stroke-width="3"/>
  <circle cx="25" cy="25" r="6" fill="#4A6C58"/>
  <text x="55" y="32" font-family="Arial, sans-serif" font-size="20" font-weight="600" fill="#4A6C58">CommonGround</text>
</svg>''',

    "welcome": '''<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <circle cx="35" cy="35" r="12" fill="#4A6C58"/>
  <path d="M35 50 L35 75 M20 58 L35 50 L50 58 M25 95 L35 75 L45 95" stroke="#4A6C58" stroke-width="6" stroke-linecap="round" fill="none"/>
  <circle cx="85" cy="35" r="12" fill="#6B9B7A"/>
  <path d="M85 50 L85 75 M70 58 L85 50 L100 58 M75 95 L85 75 L95 95" stroke="#6B9B7A" stroke-width="6" stroke-linecap="round" fill="none"/>
  <path d="M45 55 Q60 45 75 55" stroke="#4A6C58" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.5"/>
</svg>''',

    "security": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <path d="M40 8 L68 20 L68 38 C68 54 54 68 40 72 C26 68 12 54 12 38 L12 20 Z" fill="#475569"/>
  <path d="M28 40 L36 48 L52 32" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>''',

    "message": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <path d="M12 15 C12 11 15 8 19 8 L61 8 C65 8 68 11 68 15 L68 47 C68 51 65 54 61 54 L28 54 L16 66 L16 54 L19 54 C15 54 12 51 12 47 Z" fill="#4A6C58"/>
  <path d="M40 24 C37 21 32 21 29 24 C26 27 26 32 29 35 L40 46 L51 35 C54 32 54 27 51 24 C48 21 43 21 40 24 Z" fill="white"/>
</svg>''',

    "calendar": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <rect x="10" y="16" width="60" height="54" rx="6" fill="#4A6C58"/>
  <rect x="10" y="16" width="60" height="16" rx="6" fill="#3A5646"/>
  <rect x="22" y="8" width="6" height="16" rx="2" fill="#4A6C58"/>
  <rect x="52" y="8" width="6" height="16" rx="2" fill="#4A6C58"/>
  <path d="M28 48 L36 56 L54 38" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>''',

    "document": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <path d="M18 8 L50 8 L62 20 L62 72 L18 72 Z" fill="#D4A574"/>
  <path d="M50 8 L50 20 L62 20" fill="#C4956A"/>
  <rect x="26" y="32" width="28" height="4" rx="2" fill="white" opacity="0.7"/>
  <rect x="26" y="42" width="20" height="4" rx="2" fill="white" opacity="0.7"/>
  <circle cx="52" cy="58" r="10" fill="#C4956A"/>
  <circle cx="52" cy="58" r="6" fill="#D4A574"/>
</svg>''',

    "video": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <rect x="8" y="22" width="44" height="36" rx="6" fill="#8B5CF6"/>
  <path d="M52 32 L72 20 L72 60 L52 48 Z" fill="#7C3AED"/>
  <circle cx="30" cy="40" r="8" fill="white" opacity="0.3"/>
</svg>''',

    "money": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <rect x="8" y="24" width="52" height="40" rx="6" fill="#D4A574"/>
  <rect x="8" y="24" width="52" height="12" fill="#C4956A"/>
  <circle cx="60" cy="50" r="16" fill="#C4956A" stroke="#D4A574" stroke-width="3"/>
  <text x="60" y="56" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">$</text>
</svg>''',

    "family": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="25" r="14" fill="#8B5CF6"/>
  <circle cx="22" cy="55" r="12" fill="#7C3AED"/>
  <circle cx="58" cy="55" r="12" fill="#7C3AED"/>
  <line x1="32" y1="36" x2="26" y2="45" stroke="#8B5CF6" stroke-width="4" stroke-linecap="round"/>
  <line x1="48" y1="36" x2="54" y2="45" stroke="#8B5CF6" stroke-width="4" stroke-linecap="round"/>
  <line x1="32" y1="55" x2="46" y2="55" stroke="#7C3AED" stroke-width="4" stroke-linecap="round"/>
</svg>''',

    "checkmark": '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="#4A6C58"/>
  <path d="M8 12 L11 15 L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>''',

    "warning": '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M12 2 L22 20 L2 20 Z" fill="#D4A574"/>
  <text x="12" y="17" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">!</text>
</svg>''',

    "arrow_right": '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M5 12 L19 12 M14 7 L19 12 L14 17" stroke="#4A6C58" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>''',
}


def _svg_to_data_uri(svg: str) -> str:
    """Convert SVG string to base64 data URI."""
    svg_bytes = svg.strip().encode('utf-8')
    b64 = base64.b64encode(svg_bytes).decode('utf-8')
    return f"data:image/svg+xml;base64,{b64}"


# Generate data URIs for all icons
ICON_LOGO = _svg_to_data_uri(_ICONS["logo"])
ICON_WELCOME = _svg_to_data_uri(_ICONS["welcome"])
ICON_SECURITY = _svg_to_data_uri(_ICONS["security"])
ICON_MESSAGE = _svg_to_data_uri(_ICONS["message"])
ICON_CALENDAR = _svg_to_data_uri(_ICONS["calendar"])
ICON_DOCUMENT = _svg_to_data_uri(_ICONS["document"])
ICON_VIDEO = _svg_to_data_uri(_ICONS["video"])
ICON_MONEY = _svg_to_data_uri(_ICONS["money"])
ICON_FAMILY = _svg_to_data_uri(_ICONS["family"])
ICON_CHECKMARK = _svg_to_data_uri(_ICONS["checkmark"])
ICON_WARNING = _svg_to_data_uri(_ICONS["warning"])
ICON_ARROW_RIGHT = _svg_to_data_uri(_ICONS["arrow_right"])

# Dictionary for template access
EMAIL_ICONS = {
    "logo": ICON_LOGO,
    "welcome": ICON_WELCOME,
    "security": ICON_SECURITY,
    "message": ICON_MESSAGE,
    "calendar": ICON_CALENDAR,
    "document": ICON_DOCUMENT,
    "video": ICON_VIDEO,
    "money": ICON_MONEY,
    "family": ICON_FAMILY,
    "checkmark": ICON_CHECKMARK,
    "warning": ICON_WARNING,
    "arrow_right": ICON_ARROW_RIGHT,
}
