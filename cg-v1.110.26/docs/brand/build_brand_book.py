#!/usr/bin/env python3
"""Build the CommonGround print brand book.

Reads the real logo + the custom icon set from the frontend, inlines everything
into a single self-contained HTML file (docs/brand/brand-book.html), then (if
Chrome is present) renders it to CommonGround-Brand-Book.pdf.

Run:  python3 docs/brand/build_brand_book.py
"""
from __future__ import annotations
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]          # cg-v1.110.26/
FE = ROOT / "frontend"
ICONS = FE / "public" / "brand" / "icons"
OUT_DIR = Path(__file__).resolve().parent            # docs/brand/
HTML = OUT_DIR / "brand-book.html"
PDF = OUT_DIR / "CommonGround-Brand-Book.pdf"

TEAL, BLUE, GOLD, NAVY, SOFT = "#3DAA8A", "#2D6A8F", "#F5A623", "#1E3A4A", "#F4F8F7"


def svg(name: str) -> str:
    return (ICONS / f"{name}.svg").read_text().strip()


LOGO = (FE / "app" / "icon.svg").read_text().strip()

ICON_GROUPS = [
    ("Brand", [("logo-glyph", "Mark"), ("parents", "Parents"), ("child", "Child"),
               ("mycircle", "My Circle"), ("heart", "Care"), ("handshake", "Collaboration")]),
    ("Features", [("aria", "ARIA"), ("timebridge", "TimeBridge"), ("clearfund", "ClearFund"),
                  ("kidcoms", "KidComs"), ("kidspace", "KidSpace"), ("safespace", "SafeSpace"),
                  ("freshstart", "FreshStart"), ("agreement", "Agreement"), ("exchange", "Exchange"),
                  ("familyfile", "Family Files"), ("schedule", "Schedule"), ("custody", "Custody"),
                  ("wallet", "Child Wallet")]),
    ("Portals", [("professional", "Professional"), ("court", "Court"),
                 ("compliance", "Compliance"), ("export", "Court Export")]),
    ("UI", [("messages", "Messages"), ("video-call", "Video Call"), ("checkin", "GPS Check-in"),
            ("notifications", "Notifications"), ("settings", "Settings"), ("security", "Security"),
            ("privacy", "Privacy")]),
]

CORE = [
    (TEAL, "Calm Teal", "--primary", "Trust · primary · Parent A", "#fff"),
    (BLUE, "Ocean Blue", "--secondary", "Stability · Parent B · pro", "#fff"),
    (GOLD, "Child Gold", "--cg-amber", "The child · warmth · arch", NAVY),
    (NAVY, "Deep Navy", "--foreground", "Headings · authority", "#fff"),
    (SOFT, "Soft White", "--background", "App background", NAVY),
    ("#FFFFFF", "Pure White", "--card", "Cards · surfaces", NAVY),
]
SUPPORT = [("#5BC4A0", "Soft Teal"), ("#4BA8C8", "Sky Blue"), ("#E8F4F0", "Teal wash"),
           ("#E0EFF8", "Blue wash"), ("#FEF7ED", "Gold wash"), ("#D6ECE8", "Border")]
STATUS = [(TEAL, "Success", "#fff"), (GOLD, "Warning", NAVY),
          ("#C53030", "Error", "#fff"), ("#0284C7", "Info", "#fff")]
SCALE = [("4xl", "40", "Hero"), ("3xl", "32", "Page heading"), ("2xl", "26", "Section"),
         ("xl", "22", "Subhead"), ("lg", "19", "Lead"), ("base", "17", "Body"),
         ("sm", "15", "Secondary"), ("xs", "13", "Caption")]


def core_html() -> str:
    cells = ""
    for hex_, name, tok, note, ink in CORE:
        cells += f"""<div class="swatch"><div class="chip" style="background:{hex_};color:{ink}">
        <span class="mono">{hex_}</span></div><div class="meta"><b>{name}</b>
        <span class="mono tokv">{tok}</span><span class="note">{note}</span></div></div>"""
    return cells


def support_html() -> str:
    out = ""
    for hex_, name in SUPPORT:
        out += f"""<div class="mini"><div class="minichip" style="background:{hex_}"></div>
        <b>{name}</b><span class="mono">{hex_}</span></div>"""
    return out


def status_html() -> str:
    out = ""
    for hex_, name, ink in STATUS:
        out += f"""<div class="statuschip" style="background:{hex_};color:{ink}">
        <span>{name}</span><span class="mono">{hex_}</span></div>"""
    return out


def scale_html() -> str:
    out = ""
    for tok, px, use in SCALE:
        out += f"""<div class="scalerow"><span class="mono tok">{tok}</span>
        <span class="mono px">{px}px</span>
        <span class="spec" style="font-size:{px}px">{use}</span></div>"""
    return out


def icons_html() -> str:
    out = ""
    for title, items in ICON_GROUPS:
        cells = ""
        for name, label in items:
            cells += f'<div class="icell">{svg(name)}<span>{label}</span></div>'
        out += f'<div class="igroup"><h4>{title}</h4><div class="igrid">{cells}</div></div>'
    return out


CSS = f"""
@page {{ size: Letter; margin: 0; }}
* {{ box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
html,body {{ margin:0; padding:0; font-family:'DM Sans',system-ui,sans-serif; color:{NAVY}; }}
.page {{ width:8.5in; height:11in; padding:0.75in 0.85in; page-break-after:always;
  position:relative; overflow:hidden; background:{SOFT}; }}
.page:last-child {{ page-break-after:auto; }}
.serif {{ font-family:'DM Serif Display',Georgia,serif; font-weight:400; }}
.eyebrow {{ font-size:11px; font-weight:600; letter-spacing:.18em; text-transform:uppercase;
  color:{TEAL}; margin:0 0 6px; }}
h2.title {{ font-family:'DM Serif Display',Georgia,serif; font-size:34px; margin:0 0 26px;
  font-weight:400; line-height:1.1; }}
h4 {{ font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#6B8A9A;
  margin:22px 0 12px; }}
.footer {{ position:absolute; bottom:0.5in; left:0.85in; right:0.85in; display:flex;
  justify-content:space-between; font-size:10px; color:#8FA6B2;
  border-top:1px solid {'#D6ECE8'}; padding-top:8px; }}

/* Cover */
.cover {{ display:flex; flex-direction:column; align-items:center; justify-content:center;
  text-align:center; height:11in; padding:0; background:{SOFT}; }}
.cover .logobox {{ width:150px; height:150px; border-radius:34px; background:#fff;
  box-shadow:0 2px 10px rgba(0,0,0,.06); display:flex; align-items:center; justify-content:center;
  margin-bottom:38px; }}
.cover .logobox svg {{ width:118px; height:118px; }}
.cover h1 {{ font-family:'DM Serif Display',Georgia,serif; font-weight:400; font-size:52px;
  margin:0 0 18px; line-height:1.05; }}
.cover p {{ max-width:5in; font-size:16px; line-height:1.6; color:#4A4A47; margin:0 0 30px; }}
.pills {{ display:flex; gap:10px; }}
.pill {{ font-size:12px; font-weight:600; padding:6px 15px; border-radius:99px; }}

/* Logo page */
.markbig {{ display:flex; align-items:center; justify-content:center; height:2.4in;
  background:#fff; border:1px solid #D6ECE8; border-radius:20px; margin-bottom:22px; }}
.markbig svg {{ width:170px; height:170px; }}
.cols {{ display:flex; gap:18px; }}
.card {{ flex:1; background:#fff; border:1px solid #D6ECE8; border-radius:16px; padding:20px; }}
.card b.h {{ display:block; font-size:14px; margin-bottom:10px; }}
.card ul {{ margin:0; padding-left:16px; }}
.card li {{ font-size:12.5px; line-height:1.7; color:#4A4A47; }}
.dot {{ display:inline-block; width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:middle; }}

/* Color */
.swatchgrid {{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }}
.swatch {{ border:1px solid #D6ECE8; border-radius:14px; overflow:hidden; background:#fff; }}
.chip {{ height:74px; display:flex; align-items:flex-end; padding:8px; }}
.meta {{ padding:8px 10px; }}
.meta b {{ font-size:13px; }} .meta .tokv {{ display:block; font-size:10px; color:#6B8A9A; }}
.meta .note {{ display:block; font-size:11px; color:#4A4A47; margin-top:2px; }}
.mono {{ font-family:'DM Mono',ui-monospace,monospace; font-size:11px; }}
.lower {{ display:flex; gap:22px; margin-top:22px; }}
.lower > div {{ flex:1; }}
.minis {{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }}
.mini {{ border:1px solid #D6ECE8; border-radius:12px; padding:8px; background:#fff; }}
.minichip {{ height:34px; border-radius:8px; }} .mini b {{ font-size:11.5px; display:block; margin-top:6px; }}
.mini .mono {{ font-size:10px; color:#6B8A9A; }}
.statuschips {{ display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }}
.statuschip {{ display:flex; justify-content:space-between; align-items:center; padding:11px 14px;
  border-radius:12px; font-size:13px; font-weight:600; }}

/* Type */
.typecard {{ background:#fff; border:1px solid #D6ECE8; border-radius:16px; padding:24px; margin-bottom:18px; }}
.typecard .disp {{ font-family:'DM Serif Display',Georgia,serif; font-size:40px; line-height:1.1; margin:6px 0 18px; }}
.typecard .body {{ font-size:17px; line-height:1.6; color:#4A4A47; }}
.typecard .money {{ font-family:'DM Mono',monospace; font-size:15px; color:{BLUE}; margin-top:14px; }}
.scalerow {{ display:flex; align-items:baseline; gap:16px; padding:5px 0; border-bottom:1px solid #EEF6F4; }}
.scalerow .tok {{ width:40px; color:#6B8A9A; }} .scalerow .px {{ width:44px; color:#6B8A9A; }}
.scalerow .spec {{ line-height:1.15; }}

/* Icons */
.igroup {{ margin-bottom:6px; }}
.igrid {{ display:grid; grid-template-columns:repeat(6,1fr); gap:9px; }}
.icell {{ border:1px solid #D6ECE8; border-radius:14px; background:#fff; padding:12px 6px;
  display:flex; flex-direction:column; align-items:center; gap:7px; }}
.icell svg {{ width:32px; height:32px; }}
.icell span {{ font-size:9.5px; color:#4A4A47; text-align:center; line-height:1.1; }}

/* Imagery */
.principles li {{ font-size:13px; line-height:1.7; color:#4A4A47; margin-bottom:6px; }}
.suffix {{ background:#fff; border:1px solid #D6ECE8; border-radius:16px; padding:18px; }}
.suffix .q {{ font-style:italic; font-size:12.5px; line-height:1.6; color:#4A4A47;
  background:{SOFT}; border-radius:10px; padding:14px; }}
.dodont {{ display:flex; gap:16px; margin-top:16px; }}
.dodont > div {{ flex:1; background:#fff; border:1px solid #D6ECE8; border-radius:14px; padding:14px; }}
.dodont h5 {{ margin:0 0 8px; font-size:12px; }} .do h5 {{ color:{TEAL}; }} .dont h5 {{ color:#C53030; }}
.dodont li {{ font-size:11.5px; line-height:1.6; color:#4A4A47; }}
"""

HTML_DOC = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>CommonGround Brand Book</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>

<!-- COVER -->
<section class="page cover">
  <div class="logobox">{LOGO}</div>
  <h1>CommonGround<br>Brand Book</h1>
  <p>Quietly modern. Emotionally safe. Court-credible. Every color, image, and
  icon exists to lower the temperature for families in conflict.</p>
  <div class="pills">
    <span class="pill" style="background:#E8F4F0;color:#2D8A70">Version 1.0</span>
    <span class="pill" style="background:#E0EFF8;color:{BLUE}">June 2026</span>
    <span class="pill" style="background:#FEF7ED;color:#B8791A">Light-locked</span>
  </div>
</section>

<!-- LOGO -->
<section class="page">
  <p class="eyebrow">Identity</p><h2 class="title">The logo is a family</h2>
  <div class="markbig">{LOGO}</div>
  <div class="cols">
    <div class="card"><b class="h">Anatomy</b>
      <p style="font-size:12.5px;line-height:1.7;color:#4A4A47;margin:0">
      <span class="dot" style="background:{TEAL}"></span>Parent A (teal) &amp;
      <span class="dot" style="background:{BLUE}"></span>Parent B (ocean blue),
      each a head with a soft smile. Held together by a
      <span class="dot" style="background:{GOLD}"></span>gold arch above their
      <span class="dot" style="background:{GOLD}"></span>child. The two-tone <i>is</i>
      the meaning — two people, held together by what they're raising.</p></div>
    <div class="card"><b class="h">Clear space &amp; size</b>
      <ul><li>Keep ¼-mark clear space on all sides</li>
      <li>Min 24px glyph · 32px full icon</li>
      <li>Rounded-square on Soft White {SOFT}</li>
      <li>Scale uniformly only</li></ul></div>
    <div class="card"><b class="h" style="color:#C53030">Don't</b>
      <ul><li>Recolor the parents to one hue</li>
      <li>Make the arch/child anything but gold</li>
      <li>Add gradients, bevels, glassmorphism</li>
      <li>Rotate, skew, or stretch</li></ul></div>
  </div>
  <div class="footer"><span>CommonGround Brand Book</span><span>01 · Logo</span></div>
</section>

<!-- COLOR -->
<section class="page">
  <p class="eyebrow">Color</p><h2 class="title">Semantic, never decorative</h2>
  <div class="swatchgrid">{core_html()}</div>
  <div class="lower">
    <div><h4>Supporting &amp; tints</h4><div class="minis">{support_html()}</div></div>
    <div><h4>Status — earned, never emotional</h4><div class="statuschips">{status_html()}</div>
      <p style="font-size:11px;color:#4A4A47;margin-top:10px">Red means <i>missed / failed /
      overdue</i> — a fact, never a judgment.</p></div>
  </div>
  <div class="footer"><span>CommonGround Brand Book</span><span>02 · Color</span></div>
</section>

<!-- TYPE -->
<section class="page">
  <p class="eyebrow">Typography</p><h2 class="title">Readable under stress</h2>
  <div class="typecard">
    <p class="eyebrow" style="color:#6B8A9A">DM Serif Display · headings</p>
    <div class="disp">A calmer way to co-parent</div>
    <p class="eyebrow" style="color:#6B8A9A">DM Sans · body — 17px base, 1.6 line-height</p>
    <p class="body">We use larger sizes and generous spacing because our readers are often
    tired and anxious. Short sentences. Plain language. Warmth over cleverness.</p>
    <p class="money">DM Mono · $1,240.00 · custody 57% / 43%</p>
  </div>
  <h4>Type scale</h4>{scale_html()}
  <div class="footer"><span>CommonGround Brand Book</span><span>03 · Typography</span></div>
</section>

<!-- ICONS -->
<section class="page">
  <p class="eyebrow">Iconography</p><h2 class="title">A set drawn from the mark</h2>
  <p style="font-size:12.5px;line-height:1.6;color:#4A4A47;margin:-14px 0 4px;max-width:5.6in">
  Duotone, brand-colored icons in the logo's rounded-line + gold-arch language — for features,
  portals, and hero moments. Keep Lucide for generic UI.</p>
  {icons_html()}
  <div class="footer"><span>CommonGround Brand Book</span><span>04 · Iconography</span></div>
</section>

<!-- IMAGERY -->
<section class="page">
  <p class="eyebrow">Imagery &amp; voice</p><h2 class="title">Real, diverse families — okay</h2>
  <div class="cols">
    <div style="flex:1">
      <ul class="principles" style="margin:0;padding-left:16px">
        <li><b>Real &amp; multicultural.</b> Diverse ages, ethnicities, family shapes — never tokenized.</li>
        <li><b>Warm natural light.</b> Soft daylight, golden hour, teal-green shadows.</li>
        <li><b>Candid, not stock-posed.</b> A laugh, a piggyback, a relieved exhale.</li>
        <li><b>Show the calm after.</b> No conflict, courtrooms, or tears.</li>
        <li><b>Light-locked &amp; clean.</b> No dark/glass, no baked-in text or logos.</li>
      </ul>
      <h4>Voice</h4>
      <ul class="principles" style="margin:0;padding-left:16px">
        <li>Child-first · Neutral (Parent A/B) · Empathetic</li>
        <li>Plain language (~8th grade) · Gender-neutral</li>
      </ul>
    </div>
    <div class="suffix" style="flex:1">
      <p class="eyebrow" style="color:#6B8A9A">Higgsfield style suffix</p>
      <p class="q">Natural candid lifestyle photography, warm soft natural daylight, gentle
      film-like color grading with calm teal-green and warm golden tones, shallow depth of field,
      authentic and emotionally warm, hopeful reassuring mood, real diverse multicultural people,
      clean and airy, no text, no watermark, no logos, photorealistic.</p>
    </div>
  </div>
  <div class="dodont">
    <div class="do"><h5>Do</h5><ul style="margin:0;padding-left:15px">
      <li>Diverse real families, candid warmth</li><li>Soft daylight, teal/gold grade</li>
      <li>Show the calm "after"</li></ul></div>
    <div class="dont"><h5>Don't</h5><ul style="margin:0;padding-left:15px">
      <li>Generic all-one-demographic stock</li><li>Cold blue, harsh flash</li>
      <li>Fake a product UI with AI</li></ul></div>
  </div>
  <div class="footer"><span>CommonGround Brand Book · find-commonground.com</span><span>05 · Imagery</span></div>
</section>

</body></html>"""

HTML.write_text(HTML_DOC)
print(f"Wrote {HTML} ({len(HTML_DOC)//1024} KB)")

# Render with WeasyPrint (reliable headless HTML->PDF; needs network for web fonts).
# Install into the backend venv: pip install weasyprint
try:
    from weasyprint import HTML as _HTML  # type: ignore
    _HTML(str(HTML)).write_pdf(str(PDF))
    print(f"Rendered {PDF} ({PDF.stat().st_size // 1024} KB)")
except ImportError:
    print("WeasyPrint not installed — HTML written; run inside backend venv to render PDF.")
