"""Generate the brand logo PNG for email headers matching the website logo."""
import os
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "email-assets")


def create_email_logo():
    """
    Create centered CommonGround logo for teal email header.
    Icon (two parents + child) + "CommonGround" text in white.
    """
    w, h = 600, 100  # wider canvas for proper centering
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Load font
    font = None
    font_size = 32
    for font_path in [
        "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/System/Library/Fonts/Georgia.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    ]:
        try:
            font = ImageFont.truetype(font_path, font_size)
            break
        except (OSError, IOError):
            continue
    if font is None:
        font = ImageFont.load_default()

    # Measure text to center everything
    text = "CommonGround"
    text_bbox = font.getbbox(text)
    text_w = text_bbox[2] - text_bbox[0]

    icon_size = 70
    gap = 16
    total_w = icon_size + gap + text_w
    start_x = (w - total_w) // 2

    # Icon position
    ix = start_x
    iy = (h - icon_size) // 2
    scale = icon_size / 512.0

    # Rounded rectangle background for icon
    draw.rounded_rectangle(
        [ix, iy, ix + icon_size, iy + icon_size],
        radius=16,
        fill=(255, 255, 255, 45)
    )

    # Left parent (teal)
    cx1 = ix + int(168 * scale)
    cy1 = iy + int(148 * scale)
    r1 = int(48 * scale)
    draw.ellipse([cx1-r1, cy1-r1, cx1+r1, cy1+r1], fill=(255, 255, 255, 230))
    # Left smile
    draw.arc([cx1-int(50*scale), cy1+int(22*scale), cx1+int(50*scale), cy1+int(72*scale)],
             180, 0, fill=(255, 255, 255, 200), width=2)

    # Right parent (blue)
    cx2 = ix + int(344 * scale)
    cy2 = iy + int(148 * scale)
    r2 = int(48 * scale)
    draw.ellipse([cx2-r2, cy2-r2, cx2+r2, cy2+r2], fill=(255, 255, 255, 180))
    # Right smile
    draw.arc([cx2-int(50*scale), cy2+int(22*scale), cx2+int(50*scale), cy2+int(72*scale)],
             180, 0, fill=(255, 255, 255, 160), width=2)

    # Golden arch
    draw.arc([cx1+int(5*scale), iy+int(80*scale), cx2-int(5*scale), iy+int(185*scale)],
             180, 0, fill=(245, 166, 35, 220), width=2)

    # Child (gold)
    cx3 = ix + int(256 * scale)
    cy3 = iy + int(330 * scale)
    r3 = int(38 * scale)
    draw.ellipse([cx3-r3, cy3-r3, cx3+r3, cy3+r3], fill=(245, 166, 35, 230))
    # Child smile
    draw.arc([cx3-int(38*scale), cy3+int(14*scale), cx3+int(38*scale), cy3+int(54*scale)],
             180, 0, fill=(245, 166, 35, 200), width=2)

    # Text position - vertically centered
    text_x = ix + icon_size + gap
    text_y = (h - font_size) // 2 - 2

    # "Common" bold white
    common_bbox = font.getbbox("Common")
    common_w = common_bbox[2] - common_bbox[0]
    draw.text((text_x, text_y), "Common", fill=(255, 255, 255, 255), font=font)

    # "Ground" slightly lighter
    draw.text((text_x + common_w + 2, text_y), "Ground", fill=(255, 255, 255, 200), font=font)

    img.save(os.path.join(ASSETS_DIR, "logo-header.png"), "PNG")
    print(f"  Created logo-header.png ({w}x{h})")


if __name__ == "__main__":
    create_email_logo()
