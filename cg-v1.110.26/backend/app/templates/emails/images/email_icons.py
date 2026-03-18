"""
CommonGround Email Icons - Base64 Encoded SVGs

Brand-aligned icons for inline embedding in HTML emails.
Colors match the CommonGround design system:
  Primary Teal: #3DAA8A
  Ocean Blue: #2D6A8F
  Child Gold: #F5A623
  Deep Navy: #1E3A4A
"""

import base64

# SVG Icon Definitions — Brand-aligned
_ICONS = {
    "logo": '''<svg xmlns="http://www.w3.org/2000/svg" width="220" height="48" viewBox="0 0 220 48">
  <defs>
    <linearGradient id="lf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#5BC4A0"/>
      <stop offset="100%" stop-color="#3DAA8A"/>
    </linearGradient>
    <linearGradient id="rf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4BA8C8"/>
      <stop offset="100%" stop-color="#2D6A8F"/>
    </linearGradient>
  </defs>
  <circle cx="14" cy="12" r="5" fill="url(#lf)"/>
  <path d="M9 18 Q14 22 19 18" stroke="url(#lf)" stroke-width="2" stroke-linecap="round" fill="none"/>
  <circle cx="32" cy="12" r="5" fill="url(#rf)"/>
  <path d="M27 18 Q32 22 37 18" stroke="url(#rf)" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M19 13 Q23 9 27 13" stroke="#F5A623" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.9"/>
  <circle cx="23" cy="30" r="4.5" fill="#F5A623"/>
  <path d="M19 34 Q23 37 27 34" stroke="#F5A623" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <text x="52" y="20" font-family="'DM Sans', 'Segoe UI', Arial, sans-serif" font-size="17" font-weight="700" fill="#1E3A4A" letter-spacing="-0.3">Common</text><text x="132" y="20" font-family="'DM Sans', 'Segoe UI', Arial, sans-serif" font-size="17" font-weight="700" fill="#3DAA8A" letter-spacing="-0.3">Ground</text>
  <text x="52" y="36" font-family="'DM Sans', 'Segoe UI', Arial, sans-serif" font-size="9" fill="#6B8F80" letter-spacing="2.5">CO-PARENTING</text>
</svg>''',

    "welcome": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="38" fill="#E8F4F0"/>
  <circle cx="28" cy="28" r="8" fill="#3DAA8A"/>
  <path d="M20 38 Q28 46 36 38" stroke="#3DAA8A" stroke-width="3" stroke-linecap="round" fill="none"/>
  <circle cx="52" cy="28" r="8" fill="#2D6A8F"/>
  <path d="M44 38 Q52 46 60 38" stroke="#2D6A8F" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M36 30 Q40 24 44 30" stroke="#F5A623" stroke-width="2" stroke-linecap="round" fill="none"/>
  <circle cx="40" cy="56" r="7" fill="#F5A623"/>
  <path d="M34 62 Q40 67 46 62" stroke="#F5A623" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>''',

    "security": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="38" fill="#E0EFF8"/>
  <path d="M40 14 L60 24 L60 38 C60 52 50 62 40 66 C30 62 20 52 20 38 L20 24 Z" fill="#2D6A8F"/>
  <path d="M30 40 L37 47 L52 32" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>''',

    "message": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="38" fill="#E8F4F0"/>
  <path d="M16 20 C16 17 18 15 21 15 L59 15 C62 15 64 17 64 20 L64 48 C64 51 62 53 59 53 L30 53 L20 63 L20 53 C18 53 16 51 16 48 Z" fill="#3DAA8A"/>
  <circle cx="32" cy="34" r="3" fill="white"/>
  <circle cx="40" cy="34" r="3" fill="white"/>
  <circle cx="48" cy="34" r="3" fill="white"/>
</svg>''',

    "calendar": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="38" fill="#E8F4F0"/>
  <rect x="16" y="22" width="48" height="42" rx="6" fill="#3DAA8A"/>
  <rect x="16" y="22" width="48" height="14" rx="6" fill="#2D8A70"/>
  <rect x="26" y="16" width="4" height="12" rx="2" fill="#1E3A4A"/>
  <rect x="50" y="16" width="4" height="12" rx="2" fill="#1E3A4A"/>
  <path d="M30 48 L36 54 L50 40" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>''',

    "document": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="38" fill="#FEF7ED"/>
  <path d="M24 12 L48 12 L58 22 L58 68 L24 68 Z" fill="#F5A623"/>
  <path d="M48 12 L48 22 L58 22" fill="#D4910F"/>
  <rect x="30" y="32" width="22" height="3" rx="1.5" fill="white" opacity="0.8"/>
  <rect x="30" y="40" width="16" height="3" rx="1.5" fill="white" opacity="0.8"/>
  <rect x="30" y="48" width="19" height="3" rx="1.5" fill="white" opacity="0.8"/>
</svg>''',

    "video": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="38" fill="#E0EFF8"/>
  <rect x="14" y="24" width="36" height="32" rx="6" fill="#2D6A8F"/>
  <path d="M50 32 L66 22 L66 58 L50 48 Z" fill="#4BA8C8"/>
  <circle cx="32" cy="40" r="6" fill="white" opacity="0.3"/>
</svg>''',

    "money": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="38" fill="#FEF7ED"/>
  <rect x="14" y="26" width="40" height="34" rx="6" fill="#F5A623"/>
  <rect x="14" y="26" width="40" height="10" fill="#D4910F"/>
  <circle cx="54" cy="48" r="14" fill="#D4910F" stroke="#F5A623" stroke-width="2.5"/>
  <text x="54" y="53" font-family="'DM Sans', Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">$</text>
</svg>''',

    "family": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="38" fill="#E8F4F0"/>
  <circle cx="28" cy="24" r="9" fill="#3DAA8A"/>
  <path d="M20 36 Q28 44 36 36" stroke="#3DAA8A" stroke-width="3" stroke-linecap="round" fill="none"/>
  <circle cx="52" cy="24" r="9" fill="#2D6A8F"/>
  <path d="M44 36 Q52 44 60 36" stroke="#2D6A8F" stroke-width="3" stroke-linecap="round" fill="none"/>
  <circle cx="40" cy="56" r="8" fill="#F5A623"/>
  <path d="M32 64 Q40 70 48 64" stroke="#F5A623" stroke-width="2.5" stroke-linecap="round" fill="none"/>
</svg>''',

    "checkmark": '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10" fill="#3DAA8A"/>
  <path d="M8 12 L11 15 L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>''',

    "warning": '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M12 2 L22 20 L2 20 Z" fill="#F5A623"/>
  <text x="12" y="17" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">!</text>
</svg>''',

    "arrow_right": '''<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M5 12 L19 12 M14 7 L19 12 L14 17" stroke="#3DAA8A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>''',

    "aria": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="38" fill="#E8F4F0"/>
  <circle cx="40" cy="32" r="14" fill="#3DAA8A"/>
  <path d="M40 22 L40 42" stroke="white" stroke-width="3" stroke-linecap="round"/>
  <circle cx="40" cy="28" r="4" fill="white"/>
  <path d="M24 54 Q40 66 56 54" stroke="#3DAA8A" stroke-width="4" stroke-linecap="round" fill="none"/>
  <circle cx="32" cy="52" r="3" fill="#5BC4A0"/>
  <circle cx="48" cy="52" r="3" fill="#5BC4A0"/>
</svg>''',

    "report": '''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="38" fill="#E8F4F0"/>
  <rect x="20" y="14" width="40" height="52" rx="4" fill="#1E3A4A"/>
  <rect x="26" y="22" width="14" height="6" rx="2" fill="#3DAA8A"/>
  <rect x="26" y="34" width="28" height="2" rx="1" fill="#3DAA8A" opacity="0.4"/>
  <rect x="26" y="40" width="22" height="2" rx="1" fill="#3DAA8A" opacity="0.4"/>
  <rect x="26" y="46" width="26" height="2" rx="1" fill="#3DAA8A" opacity="0.4"/>
  <rect x="26" y="54" width="18" height="6" rx="2" fill="#F5A623"/>
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
ICON_ARIA = _svg_to_data_uri(_ICONS["aria"])
ICON_REPORT = _svg_to_data_uri(_ICONS["report"])

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
    "aria": ICON_ARIA,
    "report": ICON_REPORT,
}
