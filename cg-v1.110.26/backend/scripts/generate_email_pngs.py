"""Generate PNG email assets using Pillow (no SVG dependency)."""
import os
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "email-assets")

def create_logo_header():
    """Create the CommonGround logo for email header (white on transparent)."""
    w, h = 400, 80
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Two overlapping circles (parent icons)
    # Left circle - full white
    draw.ellipse([12, 15, 52, 55], fill=(255, 255, 255, 230))
    # Right circle - slightly transparent
    draw.ellipse([32, 15, 72, 55], fill=(255, 255, 255, 160))
    # Child circle below/between
    draw.ellipse([28, 35, 56, 63], fill=(245, 166, 35, 220))

    # Text "CommonGround"
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28)
    except (OSError, IOError):
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
        except (OSError, IOError):
            font = ImageFont.load_default()

    draw.text((85, 20), "CommonGround", fill=(255, 255, 255, 255), font=font)

    img.save(os.path.join(ASSETS_DIR, "logo-header.png"), "PNG")
    print("  Created logo-header.png")


def create_icon(filename, bg_color, shape_func, size=80):
    """Create a rounded square icon with a shape inside."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rectangle background
    draw.rounded_rectangle([0, 0, size-1, size-1], radius=16, fill=bg_color)

    # Draw the shape
    shape_func(draw, size)

    img.save(os.path.join(ASSETS_DIR, filename), "PNG")
    print(f"  Created {filename}")


def draw_agreement(draw, s):
    """Document with checkmark."""
    # Document lines
    for y_off in [22, 32, 42]:
        w = 30 if y_off == 22 else (24 if y_off == 32 else 18)
        draw.line([(20, y_off), (20 + w, y_off)], fill=(61, 170, 138), width=3)
    # Checkmark
    draw.line([(50, 48), (55, 55), (65, 40)], fill=(61, 170, 138), width=3)


def draw_aria(draw, s):
    """AI brain/sparkle icon."""
    # Circle head
    draw.ellipse([28, 16, 52, 40], outline=(61, 170, 138), width=3)
    # Eyes
    draw.ellipse([34, 25, 38, 29], fill=(61, 170, 138))
    draw.ellipse([42, 25, 46, 29], fill=(61, 170, 138))
    # Smile
    draw.arc([34, 28, 46, 38], 0, 180, fill=(61, 170, 138), width=2)
    # Sparkles
    draw.line([(20, 20), (24, 16)], fill=(245, 166, 35), width=2)
    draw.line([(56, 20), (60, 16)], fill=(245, 166, 35), width=2)
    draw.line([(40, 10), (40, 14)], fill=(245, 166, 35), width=2)
    # Body arc
    draw.arc([24, 42, 56, 68], 180, 0, fill=(61, 170, 138), width=3)


def draw_calendar(draw, s):
    """Calendar icon."""
    # Calendar body
    draw.rounded_rectangle([16, 22, 64, 62], radius=6, outline=(61, 170, 138), width=3)
    # Top bar
    draw.rectangle([16, 22, 64, 34], fill=(61, 170, 138))
    # Pins
    draw.line([(28, 16), (28, 26)], fill=(30, 58, 74), width=3)
    draw.line([(52, 16), (52, 26)], fill=(30, 58, 74), width=3)
    # Date dots
    for x in [28, 40, 52]:
        draw.ellipse([x-3, 42, x+3, 48], fill=(61, 170, 138))


def draw_clearfund(draw, s):
    """Dollar/money icon."""
    # Circle
    draw.ellipse([18, 18, 62, 62], outline=(61, 170, 138), width=3)
    # Dollar sign
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 28)
    except (OSError, IOError):
        font = ImageFont.load_default()
    draw.text((32, 24), "$", fill=(61, 170, 138), font=font)


def draw_welcome(draw, s):
    """Envelope/welcome icon."""
    # Envelope body
    draw.rounded_rectangle([12, 22, 68, 58], radius=6, outline=(61, 170, 138), width=3)
    # Envelope flap
    draw.line([(12, 26), (40, 44), (68, 26)], fill=(61, 170, 138), width=3)


def draw_security(draw, s):
    """Shield icon."""
    # Shield shape using polygon
    points = [(40, 12), (60, 22), (60, 40), (40, 58), (20, 40), (20, 22)]
    draw.polygon(points, outline=(45, 106, 143), width=3)
    # Checkmark
    draw.line([(30, 36), (37, 44), (52, 28)], fill=(45, 106, 143), width=3)


def draw_lock(draw, s):
    """Lock icon."""
    # Lock body
    draw.rounded_rectangle([24, 36, 56, 62], radius=4, fill=(245, 166, 35))
    # Lock shackle
    draw.arc([28, 18, 52, 42], 180, 0, fill=(245, 166, 35), width=4)
    # Keyhole
    draw.ellipse([36, 44, 44, 52], fill=(255, 255, 255))


def draw_kidspace(draw, s):
    """Child/person icon for KidSpace."""
    # Head
    draw.ellipse([30, 14, 50, 34], outline=(139, 92, 246), width=3)
    # Body
    draw.arc([22, 38, 58, 68], 180, 0, fill=(139, 92, 246), width=3)


def main():
    os.makedirs(ASSETS_DIR, exist_ok=True)

    # Logo
    create_logo_header()

    # Feature icons (teal background)
    bg = (232, 244, 240, 255)  # #E8F4F0
    create_icon("icon-agreement.png", bg, draw_agreement)
    create_icon("icon-aria.png", bg, draw_aria)
    create_icon("icon-calendar.png", bg, draw_calendar)
    create_icon("icon-clearfund.png", bg, draw_clearfund)
    create_icon("icon-welcome.png", bg, draw_welcome)

    # Security icons
    create_icon("icon-security.png", (232, 244, 240, 255), draw_security)
    create_icon("icon-lock.png", (254, 247, 237, 255), draw_lock)

    # KidSpace icon (purple bg)
    create_icon("icon-kidspace.png", (245, 243, 255, 255), draw_kidspace)

    print("\nAll PNGs generated!")


if __name__ == "__main__":
    main()
