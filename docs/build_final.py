"""
FreshMart Final PowerPoint Builder
20-slide modern professional presentation
Using python-pptx + PIL ImageDraw (NO cairosvg)
"""

import io
import math
from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt
import pptx.oxml.ns as nsmap
from lxml import etree

# ─── Palette ────────────────────────────────────────────────────────────────
BG_DARK    = (13,  27,  42)
MID_NAVY   = (26,  51,  79)
DEEP_PANEL = (13,  48,  80)
ACCENT_G   = (0,   194, 139)
GOLD       = (255, 195, 0)
RED        = (232, 58,  58)
WHITE      = (255, 255, 255)
LIGHT_GRAY = (208, 220, 232)
TEAL       = (0,   150, 136)
PURPLE     = (124, 58,  237)
AMBER      = (255, 140, 0)
BLACK      = (0,   0,   0)

# ─── Slide dimensions (13.33" × 7.5" @ 96dpi equiv in EMU) ─────────────────
SLIDE_W = Inches(13.33)
SLIDE_H = Inches(7.5)
IMG_W, IMG_H = 1333, 750   # pixel canvas for PIL diagrams

# ─── Helpers ────────────────────────────────────────────────────────────────

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def rgb_to_pptx(r, g=None, b=None):
    if isinstance(r, tuple): r, g, b = r
    return RGBColor(r, g, b)

def get_font(size=14):
    """Return a PIL font. Try truetype paths, fall back to default."""
    paths = [
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibrib.ttf",
        r"C:\Windows\Fonts\calibri.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\tahoma.ttf",
    ]
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except:
            pass
    return ImageFont.load_default()


def safe_text(draw, xy, text, font, fill):
    """Draw text, replacing non-latin-1 chars with ASCII equivalents."""
    text = (text
            .replace('\u2192', '->')
            .replace('\u2190', '<-')
            .replace('\u2193', 'v')
            .replace('\u2191', '^')
            .replace('\u2714', 'v')
            .replace('\u25b8', '>')
            .replace('\u00b7', '.')
            )
    try:
        ImageDraw.ImageDraw.text(draw, xy, text, font=font, fill=fill)
    except (UnicodeEncodeError, Exception):
        try:
            safe = ''.join(c if ord(c) < 256 else '?' for c in text)
            ImageDraw.ImageDraw.text(draw, xy, safe, font=font, fill=fill)
        except Exception:
            pass

def pil_to_stream(img):
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf

def add_image_to_slide(slide, img, left, top, width, height):
    stream = pil_to_stream(img)
    slide.shapes.add_picture(stream, left, top, width, height)

def gradient_bg(w, h, color1, color2, vertical=True):
    img = Image.new('RGB', (w, h))
    draw = ImageDraw.Draw(img)
    for i in range(h if vertical else w):
        ratio = i / (h if vertical else w)
        r = int(color1[0] + (color2[0]-color1[0])*ratio)
        g = int(color1[1] + (color2[1]-color1[1])*ratio)
        b = int(color1[2] + (color2[2]-color1[2])*ratio)
        if vertical:
            draw.line([(0,i),(w,i)], fill=(r,g,b))
        else:
            draw.line([(i,0),(i,h)], fill=(r,g,b))
    return img

def draw_rounded_rect(draw, xy, radius, fill=None, outline=None, width=2):
    x1,y1,x2,y2 = xy
    r = radius
    if fill:
        draw.rectangle([x1+r, y1, x2-r, y2], fill=fill)
        draw.rectangle([x1, y1+r, x2, y2-r], fill=fill)
        draw.ellipse([x1, y1, x1+2*r, y1+2*r], fill=fill)
        draw.ellipse([x2-2*r, y1, x2, y1+2*r], fill=fill)
        draw.ellipse([x1, y2-2*r, x1+2*r, y2], fill=fill)
        draw.ellipse([x2-2*r, y2-2*r, x2, y2], fill=fill)
    if outline:
        draw.arc([x1, y1, x1+2*r, y1+2*r], 180, 270, fill=outline, width=width)
        draw.arc([x2-2*r, y1, x2, y1+2*r], 270, 360, fill=outline, width=width)
        draw.arc([x1, y2-2*r, x1+2*r, y2], 90, 180, fill=outline, width=width)
        draw.arc([x2-2*r, y2-2*r, x2, y2], 0, 90, fill=outline, width=width)
        draw.line([x1+r, y1, x2-r, y1], fill=outline, width=width)
        draw.line([x1+r, y2, x2-r, y2], fill=outline, width=width)
        draw.line([x1, y1+r, x1, y2-r], fill=outline, width=width)
        draw.line([x2, y1+r, x2, y2-r], fill=outline, width=width)

def arrow(draw, x1, y1, x2, y2, color, width=2, head=8):
    draw.line([x1, y1, x2, y2], fill=color, width=width)
    angle = math.atan2(y2-y1, x2-x1)
    ax1 = x2 - head*math.cos(angle-0.4)
    ay1 = y2 - head*math.sin(angle-0.4)
    ax2 = x2 - head*math.cos(angle+0.4)
    ay2 = y2 - head*math.sin(angle+0.4)
    draw.polygon([(x2,y2),(ax1,ay1),(ax2,ay2)], fill=color)

def draw_text_centered(draw, text, cx, cy, font, color, size_hint=12):
    try:
        bbox = font.getbbox(text)
        tw = bbox[2]-bbox[0]
        th = bbox[3]-bbox[1]
    except:
        tw = len(text)*size_hint*0.6
        th = size_hint
    safe_text(draw, (cx - tw/2, cy - th/2), text, font, color)

def add_bg(slide, prs, color1=BG_DARK, color2=MID_NAVY):
    img = gradient_bg(1333, 750, color1, color2)
    stream = pil_to_stream(img)
    pic = slide.shapes.add_picture(stream, 0, 0, SLIDE_W, SLIDE_H)
    # Move bg to back
    slide.shapes._spTree.remove(pic._element)
    slide.shapes._spTree.insert(2, pic._element)

def add_textbox(slide, text, left, top, width, height,
                font_size=18, bold=False, color=WHITE,
                align=PP_ALIGN.LEFT, italic=False, wrap=True):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = rgb_to_pptx(*color)
    return txBox

def add_rect(slide, left, top, width, height, fill_color=None, line_color=None, line_width=Pt(1)):
    shape = slide.shapes.add_shape(
        pptx.enum.shapes.MSO_SHAPE_TYPE.AUTO_SHAPE if False else 1,  # MSO_CONNECTOR_TYPE
        left, top, width, height
    )
    # Use add_shape with freeform workaround — just use add_picture with solid color
    return None

# Simpler: just use add_textbox with background set via XML
def colored_box(slide, left, top, width, height, fill_rgb, text="", font_size=14,
                text_color=WHITE, bold=False, align=PP_ALIGN.CENTER, radius=0):
    from pptx.enum.shapes import MSO_SHAPE_TYPE
    shape = slide.shapes.add_shape(1, left, top, width, height)  # 1 = rectangle
    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb_to_pptx(*fill_rgb)
    shape.line.color.rgb = rgb_to_pptx(*fill_rgb)
    if text:
        tf = shape.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.alignment = align
        run = p.add_run()
        run.text = text
        run.font.size = Pt(font_size)
        run.font.bold = bold
        run.font.color.rgb = rgb_to_pptx(*text_color)
    return shape

def section_divider(slide, prs, ghost_num, title_text, subtitle_text,
                    bg1, bg2, accent_color=ACCENT_G):
    add_bg(slide, prs, bg1, bg2)
    # Ghost number
    add_textbox(slide, ghost_num,
                Inches(0.3), Inches(0.5), Inches(7), Inches(5),
                font_size=200, bold=True,
                color=(bg1[0]+15, bg1[1]+15, bg1[2]+15),
                align=PP_ALIGN.LEFT)
    # Title
    add_textbox(slide, title_text,
                Inches(1.2), Inches(2.0), Inches(11), Inches(2.0),
                font_size=52, bold=True, color=WHITE,
                align=PP_ALIGN.LEFT)
    # Subtitle
    add_textbox(slide, subtitle_text,
                Inches(1.2), Inches(4.2), Inches(11), Inches(1.0),
                font_size=20, bold=False, color=accent_color,
                align=PP_ALIGN.LEFT)
    # Bottom accent bar
    colored_box(slide, 0, int(SLIDE_H - Inches(0.12)), SLIDE_W, Inches(0.12), accent_color)

# ─────────────────────────────────────────────────────────────────────────────
#  SLIDE BUILDERS
# ─────────────────────────────────────────────────────────────────────────────

def slide01_hero(slide, prs):
    """Hero Title"""
    # Gradient BG
    img = gradient_bg(1333, 750, BG_DARK, (10, 30, 60))
    # Left green accent bar
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, 8, 750], fill=ACCENT_G)
    # Subtle grid lines
    for x in range(0, 1333, 80):
        draw.line([(x, 0), (x, 750)], fill=(255,255,255,10) if False else (20,40,60), width=1)
    for y in range(0, 750, 80):
        draw.line([(0, y), (1333, y)], fill=(20,40,60), width=1)
    stream = pil_to_stream(img)
    pic = slide.shapes.add_picture(stream, 0, 0, SLIDE_W, SLIDE_H)
    slide.shapes._spTree.remove(pic._element)
    slide.shapes._spTree.insert(2, pic._element)

    # Giant FRESH / MART
    add_textbox(slide, "FRESH", Inches(0.6), Inches(0.5), Inches(6), Inches(2.2),
                font_size=110, bold=True, color=WHITE, align=PP_ALIGN.LEFT)
    add_textbox(slide, "MART", Inches(0.6), Inches(2.3), Inches(6), Inches(2.2),
                font_size=110, bold=True, color=ACCENT_G, align=PP_ALIGN.LEFT)

    # Right floating card (dark panel)
    card = colored_box(slide, Inches(7.0), Inches(1.0), Inches(5.8), Inches(5.2),
                       DEEP_PANEL)
    card.line.color.rgb = rgb_to_pptx(*ACCENT_G)
    card.line.width = Pt(2)

    add_textbox(slide, "Autonomous Self-Billing &\nStore Operations Platform",
                Inches(7.2), Inches(1.2), Inches(5.4), Inches(1.8),
                font_size=22, bold=True, color=WHITE, align=PP_ALIGN.LEFT)

    for i, tech in enumerate(["React 19", "Expo SDK 57", "Express 5", "MongoDB 7"]):
        colored_box(slide,
                    Inches(7.2 + i*1.35), Inches(3.2), Inches(1.25), Inches(0.4),
                    ACCENT_G if i%2==0 else TEAL,
                    text=tech, font_size=11, bold=True, text_color=WHITE)

    add_textbox(slide, "Full-Stack Retail Engineering — September 2026",
                Inches(7.2), Inches(4.5), Inches(5.4), Inches(0.6),
                font_size=14, bold=False, color=GOLD, align=PP_ALIGN.LEFT)

    add_textbox(slide, "Modular Monolith · OOP 3-Tier · AOP Decorators · TypeScript Namespaces",
                Inches(7.2), Inches(5.1), Inches(5.4), Inches(0.8),
                font_size=11, bold=False, color=LIGHT_GRAY, align=PP_ALIGN.LEFT)

    # Bottom label
    add_textbox(slide, "SUPERMARKET SELF-CHECKOUT SYSTEM",
                Inches(0.6), Inches(6.6), Inches(6), Inches(0.5),
                font_size=13, bold=False, color=LIGHT_GRAY, align=PP_ALIGN.LEFT)


def slide02_problem(slide, prs):
    """The Problem"""
    img = gradient_bg(1333, 750, (20,14,8), (40,25,10))
    draw = ImageDraw.Draw(img)
    # Draw bar chart on right half
    chart_x, chart_y = 720, 120
    chart_w, chart_h = 550, 400
    draw.rectangle([chart_x, chart_y, chart_x+chart_w, chart_y+chart_h],
                   fill=(13,30,50), outline=TEAL, width=2)
    title_f = get_font()
    safe_text(draw, (chart_x+20, chart_y+12), "Retail Inventory Accuracy", font=title_f, fill=LIGHT_GRAY)

    bars = [
        ("System DB",    1.00, (60,100,200),  "100%"),
        ("Actual Shelf", 0.78, RED,            "78%"),
        ("Drift Loss",   0.22, AMBER,          "22%"),
    ]
    bar_w = 100
    spacing = 60
    start_x = chart_x + 60
    max_h = 260
    base_y = chart_y + chart_h - 60

    for i, (label, ratio, color, pct) in enumerate(bars):
        bx = start_x + i*(bar_w+spacing)
        bh = int(max_h * ratio)
        draw.rectangle([bx, base_y-bh, bx+bar_w, base_y], fill=color)
        safe_text(draw, (bx+10, base_y-bh-24), pct, font=title_f, fill=WHITE)
        safe_text(draw, (bx+5, base_y+8), label, font=title_f, fill=LIGHT_GRAY)

    # Y-axis
    for pct in [25,50,75,100]:
        y = base_y - int(max_h*pct/100)
        draw.line([(chart_x+10, y), (chart_x+chart_w-10, y)],
                  fill=(50,70,90), width=1)
        safe_text(draw, (chart_x+14, y-8), f"{pct}%", font=title_f, fill=LIGHT_GRAY)

    stream = pil_to_stream(img)
    pic = slide.shapes.add_picture(stream, 0, 0, SLIDE_W, SLIDE_H)
    slide.shapes._spTree.remove(pic._element)
    slide.shapes._spTree.insert(2, pic._element)

    # Left stats
    add_textbox(slide, "THE PROBLEM",
                Inches(0.4), Inches(0.3), Inches(6.2), Inches(0.6),
                font_size=16, bold=True, color=GOLD, align=PP_ALIGN.LEFT)

    add_textbox(slide, "86%",
                Inches(0.4), Inches(0.9), Inches(4), Inches(1.6),
                font_size=100, bold=True, color=RED, align=PP_ALIGN.LEFT)
    add_textbox(slide, "of shoppers abandon queues\nlonger than 8 minutes",
                Inches(0.4), Inches(2.4), Inches(4), Inches(0.9),
                font_size=16, bold=False, color=LIGHT_GRAY, align=PP_ALIGN.LEFT)

    add_textbox(slide, "15+ min",
                Inches(0.4), Inches(3.4), Inches(4), Inches(1.0),
                font_size=56, bold=True, color=GOLD, align=PP_ALIGN.LEFT)
    add_textbox(slide, "average queue bottleneck\nat peak hours",
                Inches(0.4), Inches(4.4), Inches(4), Inches(0.8),
                font_size=15, bold=False, color=LIGHT_GRAY, align=PP_ALIGN.LEFT)

    add_textbox(slide, "Manual inventory tracking causes 22% data drift,\ndirect revenue leakage & shrinkage.",
                Inches(0.4), Inches(5.5), Inches(5.8), Inches(1.0),
                font_size=13, bold=False, color=LIGHT_GRAY, align=PP_ALIGN.LEFT)

    # Chart title overlay
    add_textbox(slide, "Inventory Drift Analysis",
                Inches(7.5), Inches(0.2), Inches(5.0), Inches(0.5),
                font_size=14, bold=True, color=TEAL, align=PP_ALIGN.LEFT)


def slide03_solution(slide, prs):
    """Solution Hub Diagram"""
    img = Image.new('RGB', (1333, 750), BG_DARK)
    draw = ImageDraw.Draw(img)
    # Top green bar
    draw.rectangle([0,0,1333,6], fill=ACCENT_G)

    # Hub center
    cx, cy = 666, 380
    draw.ellipse([cx-70, cy-70, cx+70, cy+70], fill=DEEP_PANEL, outline=ACCENT_G, width=3)
    f = get_font()
    safe_text(draw, (cx-48, cy-20), "Fresh Mart", font=f, fill=WHITE)
    safe_text(draw, (cx-28, cy+4), "Core", font=f, fill=ACCENT_G)

    # 6 spokes
    spokes = [
        ("Barcode\nScanner",   ACCENT_G, -90),
        ("SSE\nReal-time",     TEAL,     -30),
        ("GST\nEngine",        GOLD,      30),
        ("QR\nSessions",       PURPLE,    90),
        ("Worker\nPOS",        RED,      150),
        ("Admin\nConsole",     AMBER,    210),
    ]
    spoke_r = 240
    node_w, node_h = 130, 55

    for label, color, angle_deg in spokes:
        angle = math.radians(angle_deg)
        nx = cx + int(spoke_r * math.cos(angle))
        ny = cy + int(spoke_r * math.sin(angle))
        # Line from center to node
        lx = cx + int(90 * math.cos(angle))
        ly = cy + int(90 * math.sin(angle))
        ex = nx - int(node_w/2 * math.cos(angle))
        ey = ny - int(node_h/2 * math.sin(angle))
        draw.line([(lx, ly), (ex, ey)], fill=color, width=2)
        # Node box
        nx1 = nx - node_w//2
        ny1 = ny - node_h//2
        draw_rounded_rect(draw, [nx1, ny1, nx1+node_w, ny1+node_h], 10,
                          fill=DEEP_PANEL, outline=color, width=2)
        # Label
        lines = label.split('\n')
        for li, line in enumerate(lines):
            try:
                bbox = f.getbbox(line)
                tw = bbox[2]-bbox[0]
            except:
                tw = len(line)*7
            lx2 = nx - tw//2
            ly2 = ny - 10 + li*16
            safe_text(draw, (lx2, ly2), line, font=f, fill=color)

    stream = pil_to_stream(img)
    pic = slide.shapes.add_picture(stream, 0, 0, SLIDE_W, SLIDE_H)
    slide.shapes._spTree.remove(pic._element)
    slide.shapes._spTree.insert(2, pic._element)

    add_textbox(slide, "SOLUTION AT A GLANCE",
                Inches(0.4), Inches(0.15), Inches(8), Inches(0.5),
                font_size=18, bold=True, color=WHITE, align=PP_ALIGN.LEFT)
    add_textbox(slide, "Fresh Mart orchestrates six domain modules into a unified retail intelligence platform",
                Inches(0.4), Inches(6.7), Inches(12), Inches(0.6),
                font_size=13, bold=False, color=LIGHT_GRAY, align=PP_ALIGN.CENTER)


def slide04_actors(slide, prs):
    """Three Actors"""
    add_bg(slide, prs, BG_DARK, (15,30,50))
    add_textbox(slide, "THREE ACTORS · THREE INTERFACES",
                Inches(0.4), Inches(0.2), Inches(12), Inches(0.5),
                font_size=20, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

    cards = [
        {
            "title": "CUSTOMER",
            "sub":   "Web SPA + Expo Mobile",
            "color": ACCENT_G,
            "top":   Inches(0.9),
            "items": [
                "QR code join — scan to enter session",
                "Barcode scan via Expo Camera (ZXing)",
                "Live cart with SSE real-time sync",
                "GST itemized digital receipt",
                "Secure JWT auth + SecureStore",
            ],
        },
        {
            "title": "WORKER",
            "sub":   "Worker POS Interface",
            "color": TEAL,
            "top":   Inches(1.6),
            "items": [
                "Create & manage shopping sessions",
                "Generate dynamic QR codes",
                "Payment confirmation gate",
                "Stock guard enforcement",
                "Real-time POS dashboard",
            ],
        },
        {
            "title": "ADMINISTRATOR",
            "sub":   "Admin Console",
            "color": PURPLE,
            "top":   Inches(0.9),
            "items": [
                "Product catalog CRUD + pricing",
                "Inventory alert thresholds",
                "Worker provisioning & roles",
                "Audit log trail viewer",
                "Daily sales snapshot analytics",
            ],
        },
    ]
    col_w = Inches(3.8)
    for i, card in enumerate(cards):
        left = Inches(0.4 + i * 4.3)
        top  = card["top"]
        height = Inches(5.4)
        # Card background
        bg_shape = colored_box(slide, left, top, col_w, height, DEEP_PANEL)
        bg_shape.line.color.rgb = rgb_to_pptx(*card["color"])
        bg_shape.line.width = Pt(2)
        # Color top strip
        colored_box(slide, left, top, col_w, Inches(0.55), card["color"])
        # Title
        add_textbox(slide, card["title"],
                    left + Inches(0.1), top + Inches(0.06),
                    col_w - Inches(0.2), Inches(0.42),
                    font_size=18, bold=True, color=BG_DARK, align=PP_ALIGN.CENTER)
        # Sub
        add_textbox(slide, card["sub"],
                    left + Inches(0.15), top + Inches(0.65),
                    col_w - Inches(0.3), Inches(0.35),
                    font_size=12, bold=True, color=card["color"], align=PP_ALIGN.LEFT)
        # Items
        for j, item in enumerate(card["items"]):
            add_textbox(slide, f"▸  {item}",
                        left + Inches(0.15), top + Inches(1.1 + j*0.72),
                        col_w - Inches(0.3), Inches(0.65),
                        font_size=11, bold=False, color=LIGHT_GRAY, align=PP_ALIGN.LEFT)


def slide05_arch_divider(slide, prs):
    """Section Divider — System Architecture"""
    img = gradient_bg(1333, 750, (5, 30, 40), (8, 60, 70))
    draw = ImageDraw.Draw(img)
    # Circuit-board pattern
    for x in range(0, 1333, 60):
        for y in range(0, 750, 60):
            if (x+y) % 120 == 0:
                draw.rectangle([x-2, y-2, x+2, y+2], fill=(0,80,80))
                draw.line([(x,y),(x+30,y)], fill=(0,60,60), width=1)
                draw.line([(x,y),(x,y+30)], fill=(0,60,60), width=1)
    draw.rectangle([0, 738, 1333, 750], fill=TEAL)
    stream = pil_to_stream(img)
    pic = slide.shapes.add_picture(stream, 0, 0, SLIDE_W, SLIDE_H)
    slide.shapes._spTree.remove(pic._element)
    slide.shapes._spTree.insert(2, pic._element)

    add_textbox(slide, "02",
                Inches(0.2), Inches(0.0), Inches(6), Inches(5),
                font_size=200, bold=True,
                color=(0,60,65), align=PP_ALIGN.LEFT)
    add_textbox(slide, "SYSTEM\nARCHITECTURE",
                Inches(2.5), Inches(1.8), Inches(10), Inches(3.0),
                font_size=58, bold=True, color=WHITE, align=PP_ALIGN.LEFT)
    add_textbox(slide, "Modular Monolith  ·  3-Tier OOP  ·  Docker Compose",
                Inches(2.5), Inches(4.9), Inches(10), Inches(0.7),
                font_size=20, bold=False, color=TEAL, align=PP_ALIGN.LEFT)


def slide06_layers(slide, prs):
    """Application Layers Architecture"""
    add_bg(slide, prs, BG_DARK, MID_NAVY)
    # Left accent strip
    colored_box(slide, 0, 0, Inches(0.12), SLIDE_H, ACCENT_G)

    add_textbox(slide, "APPLICATION LAYERS ARCHITECTURE",
                Inches(0.4), Inches(0.2), Inches(12), Inches(0.5),
                font_size=20, bold=True, color=WHITE, align=PP_ALIGN.LEFT)

    # Draw layered arch diagram with PIL
    img = Image.new('RGBA', (900, 580), (0,0,0,0))
    draw = ImageDraw.Draw(img)
    f = get_font()

    layers = [
        ("CLIENT LAYER",       "React 19 SPA  ·  Expo SDK 57 Mobile  ·  Vite + TypeScript",  ACCENT_G),
        ("TRANSPORT LAYER",    "NGINX Reverse Proxy  ·  Express 5 REST  ·  SSE Streaming",    TEAL),
        ("DOMAIN MODULES",     "Auth · Sessions · Cart · Checkout · Inventory · Reports",      GOLD),
        ("ODM / PERSISTENCE",  "Mongoose Schemas  ·  Validation  ·  Index Strategy",           PURPLE),
        ("DATABASE LAYER",     "MongoDB 7  ·  Collections  ·  Aggregation Pipelines",          (60,100,180)),
    ]
    lh = 88
    gap = 18
    lw = 860

    for i, (title, subtitle, color) in enumerate(layers):
        y = i * (lh + gap)
        draw_rounded_rect(draw, [0, y, lw, y+lh], 12,
                          fill=DEEP_PANEL, outline=color, width=3)
        # Color left tab
        draw.rectangle([0, y, 18, y+lh], fill=color)
        draw_rounded_rect(draw, [0, y, 18, y+lh], 6, fill=color)
        # Title
        safe_text(draw, (34, y+14), title, font=f, fill=color)
        safe_text(draw, (34, y+38), subtitle, font=f, fill=LIGHT_GRAY)
        # Arrow down
        if i < len(layers)-1:
            ax = lw//2
            ay = y + lh
            arrow(draw, ax, ay+2, ax, ay+gap-2, ACCENT_G, width=3, head=8)

    stream = pil_to_stream(img)
    add_image_to_slide(slide, img,
                       Inches(0.4), Inches(1.0),
                       Inches(9.0), Inches(5.8))

    # Right notes
    notes = [
        ("Separation", "Each layer has a single responsibility"),
        ("Scalability", "Docker containers isolate each concern"),
        ("Type Safety", "TypeScript end-to-end strict mode"),
        ("Patterns",   "Barrel exports · Singleton services"),
    ]
    for j, (k,v) in enumerate(notes):
        add_textbox(slide, k,
                    Inches(9.7), Inches(1.1 + j*1.35),
                    Inches(3.3), Inches(0.4),
                    font_size=13, bold=True, color=GOLD)
        add_textbox(slide, v,
                    Inches(9.7), Inches(1.5 + j*1.35),
                    Inches(3.3), Inches(0.5),
                    font_size=11, color=LIGHT_GRAY)


def slide07_docker(slide, prs):
    """Docker Compose Topology"""
    add_bg(slide, prs, BG_DARK, (10,25,45))
    add_textbox(slide, "DOCKER COMPOSE TOPOLOGY",
                Inches(0.4), Inches(0.2), Inches(12), Inches(0.5),
                font_size=20, bold=True, color=WHITE, align=PP_ALIGN.LEFT)

    # PIL diagram
    img = Image.new('RGB', (780, 580), BG_DARK)
    draw = ImageDraw.Draw(img)
    f = get_font()

    containers = [
        (310, 30,  200, 60, TEAL,   "NGINX :80",      "Reverse Proxy"),
        (310, 160, 200, 60, ACCENT_G,"Express API :5000","REST + SSE"),
        (310, 290, 200, 60, PURPLE, "MongoDB :27017",  "Primary Store"),
        (310, 420, 200, 50, GOLD,   "Docker Volume",   "Persistent Data"),
    ]
    ext_left = [
        (30,  40,  160, 50, (40,60,90),  "Browser",   "React SPA"),
        (30,  170, 160, 50, (40,60,90),  "Mobile App","Expo"),
        (550, 160, 170, 50, (40,60,90),  "Expo Push", "Push Notifs"),
        (550, 230, 170, 50, (40,60,90),  "SMTP",      "Email Service"),
    ]

    # Draw Docker compose border
    draw_rounded_rect(draw, [280, 10, 540, 490], 14,
                      fill=None, outline=(0,80,100), width=2)
    safe_text(draw, (290, 16), "docker-compose.yml", font=f, fill=(0,150,170))

    for x, y, w, h, col, name, sub in containers:
        draw_rounded_rect(draw, [x, y, x+w, y+h], 10, fill=col, outline=WHITE, width=1)
        safe_text(draw, (x+10, y+8), name, font=f, fill=BLACK if col==GOLD else WHITE)
        safe_text(draw, (x+10, y+30), sub, font=f, fill=(200,200,200))

    for x, y, w, h, col, name, sub in ext_left:
        draw_rounded_rect(draw, [x, y, x+w, y+h], 8, fill=col, outline=LIGHT_GRAY, width=1)
        safe_text(draw, (x+8, y+6), name, font=f, fill=WHITE)
        safe_text(draw, (x+8, y+26), sub, font=f, fill=LIGHT_GRAY)

    # Arrows
    # Browser → NGINX
    arrow(draw, 192, 65, 308, 60, TEAL, width=2, head=8)
    safe_text(draw, (205, 42), "HTTP :80", font=f, fill=LIGHT_GRAY)
    # Mobile → API
    arrow(draw, 192, 195, 308, 190, ACCENT_G, width=2, head=8)
    safe_text(draw, (200, 172), ":5000", font=f, fill=LIGHT_GRAY)
    # NGINX → API
    arrow(draw, 410, 92, 410, 158, WHITE, width=2, head=8)
    safe_text(draw, (415, 118), "proxy", font=f, fill=LIGHT_GRAY)
    # API → MongoDB
    arrow(draw, 410, 222, 410, 288, WHITE, width=2, head=8)
    safe_text(draw, (415, 248), "mongoose", font=f, fill=LIGHT_GRAY)
    # MongoDB → Volume
    arrow(draw, 410, 352, 410, 418, GOLD, width=2, head=8)
    # API → Expo Push
    arrow(draw, 512, 185, 548, 185, ACCENT_G, width=2, head=8)
    # API → SMTP
    arrow(draw, 512, 200, 548, 255, ACCENT_G, width=2, head=8)

    stream = pil_to_stream(img)
    add_image_to_slide(slide, img,
                       Inches(0.3), Inches(0.9),
                       Inches(7.8), Inches(5.8))

    # Right: env vars table
    add_textbox(slide, "Environment Variables",
                Inches(8.5), Inches(1.0), Inches(4.5), Inches(0.45),
                font_size=14, bold=True, color=GOLD)

    env_vars = [
        ("JWT_SECRET",            "Token signing key"),
        ("MONGODB_URI",           "Atlas / local URI"),
        ("PORT",                  "API port (5000)"),
        ("CLIENT_URL",            "CORS origin"),
        ("EXPO_PUBLIC_API_URL",   "Mobile endpoint"),
        ("SMTP_HOST / USER",      "Email service"),
        ("VAPID_PUBLIC_KEY",      "Web push key"),
    ]
    for j, (k, v) in enumerate(env_vars):
        bg = DEEP_PANEL if j%2==0 else MID_NAVY
        colored_box(slide,
                    Inches(8.5), Inches(1.55 + j*0.66),
                    Inches(4.5), Inches(0.6), bg,
                    text=f"{k}  —  {v}", font_size=10, text_color=LIGHT_GRAY,
                    align=PP_ALIGN.LEFT)


def slide08_workflow_divider(slide, prs):
    """Section Divider — Workflow"""
    img = gradient_bg(1333, 750, (5,30,10), (10,55,20))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 738, 1333, 750], fill=ACCENT_G)
    stream = pil_to_stream(img)
    pic = slide.shapes.add_picture(stream, 0, 0, SLIDE_W, SLIDE_H)
    slide.shapes._spTree.remove(pic._element)
    slide.shapes._spTree.insert(2, pic._element)

    add_textbox(slide, "03",
                Inches(0.2), Inches(0.0), Inches(5), Inches(5),
                font_size=200, bold=True, color=(5,50,15), align=PP_ALIGN.LEFT)
    add_textbox(slide, "END-TO-END\nWORKFLOW",
                Inches(2.5), Inches(1.5), Inches(10), Inches(3.0),
                font_size=58, bold=True, color=WHITE, align=PP_ALIGN.LEFT)
    add_textbox(slide, "Session  ·  Scan  ·  Cart  ·  Checkout  ·  Receipt",
                Inches(2.5), Inches(4.9), Inches(10), Inches(0.7),
                font_size=20, bold=False, color=ACCENT_G, align=PP_ALIGN.LEFT)


def slide09_sequence(slide, prs):
    """Shopping & Checkout Sequence Diagram"""
    add_bg(slide, prs, BG_DARK, MID_NAVY)
    add_textbox(slide, "SHOPPING & CHECKOUT SEQUENCE",
                Inches(0.3), Inches(0.15), Inches(12), Inches(0.5),
                font_size=20, bold=True, color=WHITE, align=PP_ALIGN.LEFT)

    img = Image.new('RGB', (1280, 620), BG_DARK)
    draw = ImageDraw.Draw(img)
    f = get_font()

    lifelines = [
        ("Customer",    ACCENT_G,  100),
        ("Web/Mobile",  TEAL,      370),
        ("Express API", GOLD,      640),
        ("MongoDB",     PURPLE,    910),
    ]
    ll_y = 30
    ll_h = 48
    ll_w = 160

    for name, color, x in lifelines:
        draw_rounded_rect(draw, [x-ll_w//2, ll_y, x+ll_w//2, ll_y+ll_h], 8,
                          fill=color, outline=WHITE, width=1)
        safe_text(draw, (x-len(name)*4, ll_y+16), name, font=f, fill=BLACK if color==GOLD else WHITE)
        draw.line([(x, ll_y+ll_h), (x, 600)], fill=(50,70,90), width=1)

    steps = [
        (1, "Worker creates session",        "Worker",    370, 640,  TEAL),
        (2, "Session stored",                640,  910,           ACCENT_G, None),
        (3, "Customer scans QR",              100,  370,           ACCENT_G, None),
        (4, "Barcode scan → add item",        100,  370,           ACCENT_G, None),
        (5, "POST /cart/add",                 370,  640,           TEAL, None),
        (6, "Validate stock + save",          640,  910,           GOLD, None),
        (7, "SSE cart update →",              640,  370,           GOLD, None),
        (8, "POST /checkout",                 370,  640,           TEAL, None),
        (9, "Create Order + GST calc",        640,  910,           GOLD, None),
        (10,"SSE PAYMENT_CONFIRMED →",        640,  370,           ACCENT_G, None),
    ]

    step_defs = [
        (1, "Worker creates session",       370, 640),
        (2, "Session stored in DB",         640, 910),
        (3, "Customer scans QR → join",     100, 370),
        (4, "Barcode scan + add to cart",   100, 370),
        (5, "POST /cart/add",               370, 640),
        (6, "Validate stock + save",        640, 910),
        (7, "SSE: cart.updated ←",          640, 370),
        (8, "POST /checkout",               370, 640),
        (9, "Order + GST snapshot",         640, 910),
        (10,"SSE: PAYMENT_CONFIRMED ←",     640, 100),
    ]

    colors_seq = [TEAL, PURPLE, ACCENT_G, ACCENT_G, TEAL, PURPLE, GOLD, TEAL, GOLD, ACCENT_G]
    step_y = 105
    step_gap = 49

    for idx, (num, label, x1, x2) in enumerate(step_defs):
        y = step_y + idx*step_gap
        col = colors_seq[idx]
        # Arrow direction
        if x1 < x2:
            arrow(draw, x1+5, y, x2-5, y, col, width=2, head=8)
        else:
            arrow(draw, x1-5, y, x2+5, y, col, width=2, head=8)
        # Number bubble
        draw.ellipse([x1-16, y-10, x1+16, y+10], fill=col)
        safe_text(draw, (x1-5, y-6), str(num), font=f, fill=BLACK if col==GOLD else WHITE)
        # Label
        mx = (x1+x2)//2
        safe_text(draw, (mx-len(label)*3, y-18), label, font=f, fill=LIGHT_GRAY)

    stream = pil_to_stream(img)
    add_image_to_slide(slide, img,
                       Inches(0.2), Inches(0.75),
                       Inches(12.9), Inches(6.2))


def slide10_state_machine(slide, prs):
    """Session State Machine"""
    add_bg(slide, prs, BG_DARK, MID_NAVY)
    add_textbox(slide, "SESSION STATE MACHINE",
                Inches(0.4), Inches(0.2), Inches(12), Inches(0.5),
                font_size=20, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

    img = Image.new('RGB', (1200, 560), BG_DARK)
    draw = ImageDraw.Draw(img)
    f = get_font()

    states = [
        ("ACTIVE",            ACCENT_G,  160, 200),
        ("CHECKOUT\nPENDING", GOLD,      450, 200),
        ("PAID",              TEAL,      740, 200),
        ("COMPLETED",         LIGHT_GRAY,1030, 200),
        ("CANCELLED",         RED,       160, 400),
    ]
    sw, sh = 170, 65

    for name, color, x, y in states:
        draw_rounded_rect(draw, [x-sw//2, y-sh//2, x+sw//2, y+sh//2], 16,
                          fill=DEEP_PANEL, outline=color, width=3)
        lines = name.split('\n')
        for li, line in enumerate(lines):
            try:
                bbox = f.getbbox(line)
                tw = bbox[2]-bbox[0]
            except:
                tw = len(line)*7
            safe_text(draw, (x-tw//2, y - 8 + li*18), line, font=f, fill=color)

    # Arrows
    transitions = [
        (("ACTIVE",160,200), ("CHECKOUT\nPENDING",450,200), "Customer\ninitiate checkout", TEAL),
        (("CHECKOUT\nPENDING",450,200), ("PAID",740,200), "Worker\nconfirms payment", GOLD),
        (("PAID",740,200), ("COMPLETED",1030,200), "Stock guard\ndecrement done", ACCENT_G),
        (("ACTIVE",160,200), ("CANCELLED",160,400), "Timeout /\ncancellation", RED),
    ]
    for (_, x1,y1), (_, x2,y2), label, color in transitions:
        if y1 == y2:
            sx = x1 + sw//2
            ex = x2 - sw//2
            arrow(draw, sx, y1, ex, y2, color, width=2, head=10)
            mx = (sx+ex)//2
            safe_text(draw, (mx - len(label.split('\n')[0])*3, y1-26),
                      label.split('\n')[0], font=f, fill=color)
            if '\n' in label:
                safe_text(draw, (mx - len(label.split('\n')[1])*3, y1-12),
                          label.split('\n')[1], font=f, fill=color)
        else:
            arrow(draw, x1, y1+sh//2, x2, y2-sh//2, color, width=2, head=10)
            safe_text(draw, (x1+10, (y1+y2)//2), label.split('\n')[0], font=f, fill=color)
            if '\n' in label:
                safe_text(draw, (x1+10, (y1+y2)//2+14), label.split('\n')[1], font=f, fill=color)

    # Initial dot
    draw.ellipse([110, 192, 130, 212], fill=ACCENT_G)
    arrow(draw, 132, 202, 73, 202, ACCENT_G, width=2, head=8)

    # Legend
    safe_text(draw, (40, 480), "State Machine — ShoppingSession lifecycle", font=f, fill=LIGHT_GRAY)

    stream = pil_to_stream(img)
    add_image_to_slide(slide, img,
                       Inches(0.3), Inches(0.85),
                       Inches(12.6), Inches(5.9))


def slide11_mobile_divider(slide, prs):
    """Section Divider — Mobile"""
    img = gradient_bg(1333, 750, (20,5,40), (40,10,80))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0,738,1333,750], fill=PURPLE)
    stream = pil_to_stream(img)
    pic = slide.shapes.add_picture(stream, 0, 0, SLIDE_W, SLIDE_H)
    slide.shapes._spTree.remove(pic._element)
    slide.shapes._spTree.insert(2, pic._element)

    add_textbox(slide, "04",
                Inches(0.2), Inches(0.0), Inches(5), Inches(5),
                font_size=200, bold=True, color=(35,8,65), align=PP_ALIGN.LEFT)
    add_textbox(slide, "MOBILE\nAPPLICATION",
                Inches(2.5), Inches(1.5), Inches(10), Inches(3.0),
                font_size=58, bold=True, color=WHITE, align=PP_ALIGN.LEFT)
    add_textbox(slide, "Expo SDK 57  ·  React Native  ·  Zustand  ·  SecureStore",
                Inches(2.5), Inches(4.9), Inches(10), Inches(0.7),
                font_size=20, bold=False, color=PURPLE, align=PP_ALIGN.LEFT)


def slide12_mobile_arch(slide, prs):
    """Mobile Architecture"""
    add_bg(slide, prs, BG_DARK, (15,10,35))
    add_textbox(slide, "MOBILE APP ARCHITECTURE",
                Inches(0.4), Inches(0.2), Inches(12), Inches(0.5),
                font_size=20, bold=True, color=WHITE, align=PP_ALIGN.LEFT)

    # Phone diagram
    img = Image.new('RGB', (520, 600), BG_DARK)
    draw = ImageDraw.Draw(img)
    f = get_font()

    # Phone outline
    draw_rounded_rect(draw, [60, 20, 460, 580], 28, fill=(20,15,40), outline=PURPLE, width=3)
    draw.ellipse([220, 32, 300, 50], fill=(40,30,60))  # notch

    layers_m = [
        ("SCREENS",    "Login · QR Scan · Cart · Receipt",     PURPLE,  80),
        ("NAVIGATION", "React Navigation Stack + Tabs",         TEAL,   185),
        ("STATE",      "Zustand · SecureStore · AsyncStorage",  GOLD,   275),
        ("SERVICES",   "Axios · SSE EventSource · REST",        ACCENT_G,365),
        ("HARDWARE",   "Expo Camera · ZXing Barcode",           RED,    455),
    ]
    for title, sub, color, y in layers_m:
        draw_rounded_rect(draw, [80, y, 440, y+75], 10, fill=DEEP_PANEL, outline=color, width=2)
        safe_text(draw, (100, y+12), title, font=f, fill=color)
        safe_text(draw, (100, y+34), sub, font=f, fill=LIGHT_GRAY)
        if y < 455:
            arrow(draw, 260, y+76, 260, y+82, color, width=2, head=5)

    stream = pil_to_stream(img)
    add_image_to_slide(slide, img,
                       Inches(0.3), Inches(0.9),
                       Inches(5.2), Inches(6.0))

    # Feature callouts
    features = [
        (ACCENT_G, "QR Session Join",     "Expo Camera reads QR code generated\nby Worker POS interface"),
        (TEAL,     "Barcode Scanner",     "ZXing library via Expo Camera\nreads product barcodes in real time"),
        (GOLD,     "Secure Storage",      "JWT tokens stored in Expo SecureStore\n(hardware-backed on iOS/Android)"),
        (PURPLE,   "Live Cart Sync",      "SSE EventSource keeps cart in sync\nacross web and mobile simultaneously"),
        (RED,      "Push Notifications",  "Expo Push Notifications alert\ncustomers to payment confirmation"),
    ]
    for j, (color, title, desc) in enumerate(features):
        colored_box(slide,
                    Inches(5.9), Inches(0.9 + j*1.18),
                    Inches(0.12), Inches(0.9), color)
        add_textbox(slide, title,
                    Inches(6.1), Inches(0.9 + j*1.18),
                    Inches(6.8), Inches(0.38),
                    font_size=13, bold=True, color=color)
        add_textbox(slide, desc,
                    Inches(6.1), Inches(1.27 + j*1.18),
                    Inches(6.8), Inches(0.55),
                    font_size=11, color=LIGHT_GRAY)


def slide13_data_divider(slide, prs):
    """Section Divider — Data"""
    img = gradient_bg(1333, 750, (25,20,5), (55,40,8))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0,738,1333,750], fill=GOLD)
    stream = pil_to_stream(img)
    pic = slide.shapes.add_picture(stream, 0, 0, SLIDE_W, SLIDE_H)
    slide.shapes._spTree.remove(pic._element)
    slide.shapes._spTree.insert(2, pic._element)

    add_textbox(slide, "05",
                Inches(0.2), Inches(0.0), Inches(5), Inches(5),
                font_size=200, bold=True, color=(50,38,8), align=PP_ALIGN.LEFT)
    add_textbox(slide, "DATA &\nDOMAIN MODEL",
                Inches(2.5), Inches(1.5), Inches(10), Inches(3.0),
                font_size=56, bold=True, color=WHITE, align=PP_ALIGN.LEFT)
    add_textbox(slide, "MongoDB  ·  Mongoose  ·  Immutable Snapshots",
                Inches(2.5), Inches(4.9), Inches(10), Inches(0.7),
                font_size=20, bold=False, color=GOLD, align=PP_ALIGN.LEFT)


def slide14_er(slide, prs):
    """Entity Relationship Overview"""
    add_bg(slide, prs, BG_DARK, MID_NAVY)
    add_textbox(slide, "ENTITY RELATIONSHIP OVERVIEW",
                Inches(0.4), Inches(0.15), Inches(12), Inches(0.5),
                font_size=20, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

    img = Image.new('RGB', (1280, 620), BG_DARK)
    draw = ImageDraw.Draw(img)
    f = get_font()

    entities = {
        "USER":             (ACCENT_G,  100, 100, ["_id: ObjectId", "email: String", "role: Enum", "store: Ref"]),
        "STORE":            (TEAL,      100, 310, ["_id: ObjectId", "name: String", "address: String", "workers: [Ref]"]),
        "SHOPPING_SESSION": (GOLD,      480, 200, ["sessionId: String", "status: Enum", "customer: Ref", "store: Ref"]),
        "CART":             (PURPLE,    480, 400, ["session: Ref", "items: [{product,qty,price}]", "total: Number"]),
        "ORDER":            (AMBER,     860, 120, ["session: Ref", "items: [snapshot]", "gst: {cgst,sgst}", "total: Number"]),
        "PAYMENT":          (TEAL,      860, 310, ["order: Ref", "method: Enum", "status: String", "paidAt: Date"]),
        "PRODUCT":          (RED,       860, 490, ["barcode: String", "name: String", "price: Number", "stock: Number"]),
        "INVENTORY_ALERT":  (GOLD,      1130,490, ["product: Ref", "threshold: Number", "triggered: Boolean"]),
    }
    ew, eh = 210, 92

    for name, (color, cx, cy, fields) in entities.items():
        x, y = cx - ew//2, cy - eh//2
        draw_rounded_rect(draw, [x, y, x+ew, y+eh], 8, fill=DEEP_PANEL, outline=color, width=2)
        draw.rectangle([x, y, x+ew, y+22], fill=color)
        safe_text(draw, (x+6, y+5), name, font=f, fill=BLACK if color==GOLD else WHITE)
        for fi, field in enumerate(fields[:3]):
            safe_text(draw, (x+8, y+28+fi*18), field, font=f, fill=LIGHT_GRAY)

    # Relationships
    rels = [
        ("USER", "SHOPPING_SESSION", "creates", ACCENT_G),
        ("STORE","SHOPPING_SESSION", "hosts",   TEAL),
        ("SHOPPING_SESSION","CART",  "has",     GOLD),
        ("SHOPPING_SESSION","ORDER", "produces",AMBER),
        ("ORDER","PAYMENT",          "records", TEAL),
        ("PRODUCT","INVENTORY_ALERT","triggers",RED),
    ]
    def center(name):
        color, cx, cy, _ = entities[name]
        return cx, cy

    for e1, e2, label, color in rels:
        x1, y1 = center(e1)
        x2, y2 = center(e2)
        arrow(draw, x1, y1, x2, y2, color, width=2, head=8)
        mx, my = (x1+x2)//2, (y1+y2)//2
        safe_text(draw, (mx-len(label)*3, my-12), label, font=f, fill=color)

    stream = pil_to_stream(img)
    add_image_to_slide(slide, img,
                       Inches(0.1), Inches(0.8),
                       Inches(13.1), Inches(6.2))


def slide15_eng_divider(slide, prs):
    """Section Divider — Engineering"""
    img = gradient_bg(1333, 750, BG_DARK, (20,10,50))
    draw = ImageDraw.Draw(img)
    # Circuit lines
    for i in range(0, 1333, 100):
        draw.line([(i, 0), (i, 750)], fill=(20,15,40), width=1)
    for j in range(0, 750, 80):
        draw.line([(0, j), (1333, j)], fill=(20,15,40), width=1)
    draw.rectangle([0,738,1333,750], fill=PURPLE)
    stream = pil_to_stream(img)
    pic = slide.shapes.add_picture(stream, 0, 0, SLIDE_W, SLIDE_H)
    slide.shapes._spTree.remove(pic._element)
    slide.shapes._spTree.insert(2, pic._element)

    add_textbox(slide, "06",
                Inches(0.2), Inches(0.0), Inches(5), Inches(5),
                font_size=200, bold=True, color=(22,12,45), align=PP_ALIGN.LEFT)
    add_textbox(slide, "ENGINEERING\nDECISIONS",
                Inches(2.5), Inches(1.6), Inches(10), Inches(2.8),
                font_size=56, bold=True, color=WHITE, align=PP_ALIGN.LEFT)
    add_textbox(slide, "Why we built it this way — Architecture Decision Records",
                Inches(2.5), Inches(4.6), Inches(10), Inches(0.7),
                font_size=18, bold=False, color=PURPLE, align=PP_ALIGN.LEFT)


def slide16_oop(slide, prs):
    """OOP 3-Tier Architecture"""
    add_bg(slide, prs, BG_DARK, MID_NAVY)
    add_textbox(slide, "OOP 3-TIER ARCHITECTURE",
                Inches(0.4), Inches(0.2), Inches(12), Inches(0.5),
                font_size=20, bold=True, color=WHITE, align=PP_ALIGN.LEFT)

    # Left: class hierarchy PIL
    img = Image.new('RGB', (600, 560), BG_DARK)
    draw = ImageDraw.Draw(img)
    f = get_font()

    # BaseController
    draw_rounded_rect(draw, [175, 20, 425, 80], 10, fill=(40,40,60), outline=LIGHT_GRAY, width=2)
    safe_text(draw, (195, 32), "«abstract»", font=f, fill=LIGHT_GRAY)
    safe_text(draw, (195, 50), "BaseController", font=f, fill=WHITE)

    controllers = [
        ("ProductController", ACCENT_G, 60),
        ("CartController",    TEAL,     240),
        ("CheckoutController",GOLD,     420),
    ]
    arrow(draw, 300, 82, 300, 118, LIGHT_GRAY, width=1, head=6)
    draw.line([(110, 118), (490, 118)], fill=LIGHT_GRAY, width=1)

    for cname, color, cx in controllers:
        # Vertical drop
        draw.line([(cx+75, 118), (cx+75, 145)], fill=LIGHT_GRAY, width=1)
        arrow(draw, cx+75, 145, cx+75, 168, LIGHT_GRAY, width=1, head=6)
        # Controller box
        draw_rounded_rect(draw, [cx, 168, cx+150, 228], 8, fill=DEEP_PANEL, outline=color, width=2)
        safe_text(draw, (cx+10, 180), cname[:16], font=f, fill=color)
        safe_text(draw, (cx+10, 200), "extends Base", font=f, fill=LIGHT_GRAY)
        # Service box
        arrow(draw, cx+75, 230, cx+75, 270, color, width=1, head=6)
        draw_rounded_rect(draw, [cx, 270, cx+150, 330], 8, fill=DEEP_PANEL, outline=color, width=2)
        sname = cname.replace("Controller","Service")
        safe_text(draw, (cx+6, 280), sname[:14], font=f, fill=color)
        safe_text(draw, (cx+6, 300), "@Singleton", font=f, fill=PURPLE)

    safe_text(draw, (30, 380), "Each controller delegates ALL business logic", font=f, fill=LIGHT_GRAY)
    safe_text(draw, (30, 400), "to its paired Service class (single responsibility).", font=f, fill=LIGHT_GRAY)
    safe_text(draw, (30, 430), "BaseController provides: error handling, auth", font=f, fill=LIGHT_GRAY)
    safe_text(draw, (30, 450), "helpers, and standardised JSON response format.", font=f, fill=LIGHT_GRAY)

    stream = pil_to_stream(img)
    add_image_to_slide(slide, img,
                       Inches(0.3), Inches(0.85),
                       Inches(5.8), Inches(5.6))

    # Right: BEFORE / AFTER
    add_textbox(slide, "BEFORE — Inline Route Callback",
                Inches(6.5), Inches(0.9), Inches(6.5), Inches(0.4),
                font_size=12, bold=True, color=RED)
    before_code = (
        "router.post('/product', async (req, res) => {\n"
        "  // validation inline\n"
        "  // DB call inline\n"
        "  // error handling inline\n"
        "  // 80-line callback hell\n"
        "});"
    )
    colored_box(slide, Inches(6.5), Inches(1.35), Inches(6.5), Inches(1.5),
                (40,10,10), text=before_code, font_size=10, text_color=LIGHT_GRAY,
                align=PP_ALIGN.LEFT)

    add_textbox(slide, "AFTER — 3-Tier OOP Pattern",
                Inches(6.5), Inches(3.0), Inches(6.5), Inches(0.4),
                font_size=12, bold=True, color=ACCENT_G)
    after_code = (
        "// Route\n"
        "router.post('/', auth, controller.create);\n\n"
        "// Controller\n"
        "create = async (req, res) => {\n"
        "  const result = await this.service.create(req.body);\n"
        "  this.ok(res, result);\n"
        "};\n\n"
        "// Service  @Singleton\n"
        "async create(dto: CreateProductDto) {\n"
        "  return await Product.create(dto);\n"
        "}"
    )
    colored_box(slide, Inches(6.5), Inches(3.45), Inches(6.5), Inches(3.0),
                (5,25,15), text=after_code, font_size=10, text_color=LIGHT_GRAY,
                align=PP_ALIGN.LEFT)


def slide17_decorators(slide, prs):
    """AOP Decorators"""
    add_bg(slide, prs, BG_DARK, MID_NAVY)
    add_textbox(slide, "AOP DECORATORS",
                Inches(0.4), Inches(0.18), Inches(6), Inches(0.5),
                font_size=20, bold=True, color=WHITE, align=PP_ALIGN.LEFT)

    # 3 pill badges
    badges = [("@Singleton", PURPLE), ("@LogExecution", TEAL), ("@ValidateInput", GOLD)]
    for i, (label, color) in enumerate(badges):
        colored_box(slide,
                    Inches(0.4 + i*3.2), Inches(0.8),
                    Inches(2.8), Inches(0.5),
                    color, text=label, font_size=16, bold=True,
                    text_color=WHITE if color!=GOLD else BLACK,
                    align=PP_ALIGN.CENTER)

    # Left: code block
    code = (
        "@Singleton\n"
        "@LogExecution\n"
        "class CartService {\n"
        "\n"
        "  @ValidateInput(AddItemDto)\n"
        "  async addItem(dto: AddItemDto) {\n"
        "    const product = await\n"
        "      Product.findOne({barcode:dto.barcode});\n"
        "    if (!product) throw new NotFoundError();\n"
        "    if (product.stock < dto.qty)\n"
        "      throw new StockError();\n"
        "    return Cart.findOneAndUpdate(...);\n"
        "  }\n"
        "\n"
        "  async removeItem(dto) { ... }\n"
        "  async clearCart(sessionId) { ... }\n"
        "}"
    )
    colored_box(slide, Inches(0.3), Inches(1.5), Inches(5.5), Inches(5.5),
                (8,18,28), text=code, font_size=10, text_color=ACCENT_G,
                align=PP_ALIGN.LEFT)

    # Right: flow diagram
    img = Image.new('RGB', (620, 520), BG_DARK)
    draw = ImageDraw.Draw(img)
    f = get_font()

    flow = [
        ("Method Call",        (40,60,90),  LIGHT_GRAY),
        ("@Singleton Check",   PURPLE,      WHITE),
        ("@ValidateInput",     GOLD,        BLACK),
        ("@LogExecution Start",TEAL,        WHITE),
        ("Business Logic",     ACCENT_G,    BLACK),
        ("@LogExecution End",  TEAL,        WHITE),
        ("Return Result",      (40,60,90),  LIGHT_GRAY),
    ]
    bx, bw, bh = 160, 300, 52
    gap = 18

    for i, (label, fill, tc) in enumerate(flow):
        y = 20 + i*(bh+gap)
        draw_rounded_rect(draw, [bx, y, bx+bw, y+bh], 10, fill=fill, outline=WHITE, width=1)
        try:
            bbox = f.getbbox(label)
            tw = bbox[2]-bbox[0]
        except:
            tw = len(label)*7
        safe_text(draw, (bx+(bw-tw)//2, y+18), label, font=f, fill=tc)
        if i < len(flow)-1:
            arrow(draw, bx+bw//2, y+bh+2, bx+bw//2, y+bh+gap-2, WHITE, width=2, head=6)

    # Branch: rejected path
    arrow(draw, bx+bw, 20+1*(bh+gap)+bh//2, bx+bw+80, 20+1*(bh+gap)+bh//2, RED, width=2, head=8)
    draw_rounded_rect(draw, [bx+bw+80, 20+1*(bh+gap), bx+bw+200, 20+1*(bh+gap)+bh], 8,
                      fill=RED, outline=WHITE, width=1)
    safe_text(draw, (bx+bw+90, 20+1*(bh+gap)+18), "409 Error", font=f, fill=WHITE)

    stream = pil_to_stream(img)
    add_image_to_slide(slide, img,
                       Inches(6.1), Inches(1.4),
                       Inches(6.2), Inches(5.2))


def slide18_typescript(slide, prs):
    """TypeScript Engineering"""
    add_bg(slide, prs, BG_DARK, MID_NAVY)
    add_textbox(slide, "TYPESCRIPT ENGINEERING",
                Inches(0.4), Inches(0.2), Inches(12), Inches(0.5),
                font_size=20, bold=True, color=WHITE, align=PP_ALIGN.LEFT)

    # Namespace diagram PIL
    img = Image.new('RGB', (720, 560), BG_DARK)
    draw = ImageDraw.Draw(img)
    f = get_font()

    # Outer SupermarketDomain box
    draw_rounded_rect(draw, [20, 20, 700, 540], 16,
                      fill=(10,25,40), outline=(100,160,220), width=3)
    safe_text(draw, (30, 30), "namespace SupermarketDomain", font=f, fill=(100,160,220))

    inner = [
        ("TaxEngine",      GOLD,    30,  80, [
            "calcGST(price): GST",
            "splitCGST(gst): number",
            "splitSGST(gst): number",
            "formatTaxLabel(): string",
        ]),
        ("BarcodeEngine",  TEAL,    30, 290, [
            "validateBarcode(code)",
            "lookupProduct(code)",
            "formatDisplayName()",
            "isValidChecksum()",
        ]),
        ("SessionEngine",  PURPLE, 400,  80, [
            "generateSessionId()",
            "validateTransition()",
            "isExpired(session)",
            "getSessionSummary()",
        ]),
    ]
    for title, color, x, y, funcs in inner:
        draw_rounded_rect(draw, [x, y, x+290, y+190], 10,
                          fill=DEEP_PANEL, outline=color, width=2)
        draw.rectangle([x, y, x+290, y+26], fill=color)
        safe_text(draw, (x+10, y+6), title, font=f,
                  fill=BLACK if color==GOLD else WHITE)
        for fi, fn in enumerate(funcs):
            safe_text(draw, (x+12, y+36+fi*36), fn, font=f, fill=LIGHT_GRAY)

    # Arrows from services to TaxEngine
    arrow(draw, 400, 450, 200, 270, GOLD, width=2, head=8)
    safe_text(draw, (255, 380), "CartService +", font=f, fill=GOLD)
    safe_text(draw, (255, 396), "CheckoutService", font=f, fill=GOLD)
    safe_text(draw, (255, 412), "→ TaxEngine", font=f, fill=GOLD)

    arrow(draw, 545, 450, 170, 272, TEAL, width=2, head=8)
    safe_text(draw, (320, 460), "ProductService → BarcodeEngine", font=f, fill=TEAL)

    stream = pil_to_stream(img)
    add_image_to_slide(slide, img,
                       Inches(0.2), Inches(0.85),
                       Inches(7.2), Inches(5.6))

    # Right: tsconfig flags
    add_textbox(slide, "tsconfig.json — Strict Mode",
                Inches(7.8), Inches(0.9), Inches(5.0), Inches(0.4),
                font_size=13, bold=True, color=GOLD)
    flags = [
        ('"strict": true',              "Enables all strict type checks"),
        ('"moduleResolution": "NodeNext"', "ESM-compatible resolution"),
        ('"experimentalDecorators": true',"Enables AOP decorator syntax"),
        ('"emitDecoratorMetadata": true', "Runtime type reflection"),
        ('"sourceMap": true',            "Debug map generation"),
        ('"target": "ES2022"',           "Modern JS output"),
        ('"noImplicitAny": true',        "Forces explicit typing"),
    ]
    for j, (flag, desc) in enumerate(flags):
        colored_box(slide,
                    Inches(7.8), Inches(1.4 + j*0.72),
                    Inches(5.0), Inches(0.65),
                    DEEP_PANEL if j%2==0 else MID_NAVY,
                    text=f"{flag}", font_size=10, text_color=ACCENT_G,
                    align=PP_ALIGN.LEFT)
        add_textbox(slide, desc,
                    Inches(7.8), Inches(1.66 + j*0.72),
                    Inches(5.0), Inches(0.38),
                    font_size=9, color=LIGHT_GRAY)


def slide19_security(slide, prs):
    """Security Architecture"""
    add_bg(slide, prs, BG_DARK, (12,20,35))
    add_textbox(slide, "SECURITY ARCHITECTURE",
                Inches(0.4), Inches(0.2), Inches(12), Inches(0.5),
                font_size=20, bold=True, color=WHITE, align=PP_ALIGN.LEFT)

    # Left: security pipeline PIL
    img = Image.new('RGB', (580, 580), BG_DARK)
    draw = ImageDraw.Draw(img)
    f = get_font()

    pipeline = [
        ("HTTP Request",       (40,60,90),  LIGHT_GRAY, None,    None),
        ("Helmet.js",          TEAL,        WHITE,       None,    None),
        ("Rate Limiter",       GOLD,        BLACK,       "429",   GOLD),
        ("authenticateToken",  PURPLE,      WHITE,       "401",   PURPLE),
        ("requireRole()",      ACCENT_G,    BLACK,       "403",   ACCENT_G),
        ("Controller",         (50,80,60),  WHITE,       None,    None),
    ]
    px, pw, ph = 100, 280, 60
    gap = 24
    branch_x = px + pw + 20

    for i, (label, fill, tc, err, ec) in enumerate(pipeline):
        y = 30 + i*(ph+gap)
        draw_rounded_rect(draw, [px, y, px+pw, y+ph], 12, fill=fill, outline=WHITE, width=1)
        try:
            bbox = f.getbbox(label)
            tw = bbox[2]-bbox[0]
        except:
            tw = len(label)*7
        safe_text(draw, (px+(pw-tw)//2, y+22), label, font=f, fill=tc)
        if i < len(pipeline)-1:
            arrow(draw, px+pw//2, y+ph+2, px+pw//2, y+ph+gap-2, WHITE, width=2, head=6)
        if err:
            arrow(draw, px+pw, y+ph//2, branch_x+10, y+ph//2, ec, width=2, head=8)
            draw_rounded_rect(draw, [branch_x+10, y+ph//2-14, branch_x+90, y+ph//2+14],
                              6, fill=RED, outline=WHITE, width=1)
            safe_text(draw, (branch_x+18, y+ph//2-8), err, font=f, fill=WHITE)

    stream = pil_to_stream(img)
    add_image_to_slide(slide, img,
                       Inches(0.3), Inches(0.85),
                       Inches(5.8), Inches(5.8))

    # Right: checklist
    add_textbox(slide, "Security Checklist",
                Inches(6.5), Inches(0.9), Inches(6.2), Inches(0.4),
                font_size=14, bold=True, color=GOLD)
    checks = [
        (ACCENT_G, "JWT RS256 tokens, 7d access + refresh rotation"),
        (ACCENT_G, "bcryptjs password hashing (12 salt rounds)"),
        (ACCENT_G, "Helmet HTTP security headers (XSS, HSTS, CSP)"),
        (ACCENT_G, "Rate limiting per IP (100 req/15min default)"),
        (ACCENT_G, "CORS origin whitelist via CLIENT_URL env var"),
        (ACCENT_G, "Role-based access: CUSTOMER / WORKER / ADMIN"),
        (GOLD,     "Input validation via DTO class-transformer"),
        (GOLD,     "MongoDB injection prevention via Mongoose"),
        (GOLD,     "HTTPS enforced in Docker NGINX config"),
        (TEAL,     "Audit log trail for all admin operations"),
    ]
    for j, (color, text) in enumerate(checks):
        add_textbox(slide, f"✔  {text}",
                    Inches(6.5), Inches(1.45 + j*0.54),
                    Inches(6.6), Inches(0.48),
                    font_size=11, color=color)


def slide20_closing(slide, prs):
    """Closing Summary"""
    add_bg(slide, prs, BG_DARK, (10,25,40))
    # Top accent bar
    colored_box(slide, 0, 0, SLIDE_W, Inches(0.18), ACCENT_G)
    # Bottom accent bar
    colored_box(slide, 0, int(SLIDE_H - Inches(0.18)), SLIDE_W, Inches(0.18), GOLD)

    add_textbox(slide, "FRESH MART",
                Inches(0), Inches(0.3), SLIDE_W, Inches(1.4),
                font_size=72, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_textbox(slide, "Autonomous Self-Billing & Store Operations Platform",
                Inches(0), Inches(1.7), SLIDE_W, Inches(0.6),
                font_size=20, bold=False, color=ACCENT_G, align=PP_ALIGN.CENTER)

    # 4 stat cards
    stats = [
        ("3",        "Platforms\n(Web · Mobile · Admin)",  ACCENT_G),
        ("9",        "MongoDB\nCollections",               GOLD),
        ("5% GST",   "Auto CGST + SGST\nServer-side",     TEAL),
        ("SSE",      "Real-time Push\nAcross Clients",     PURPLE),
    ]
    card_w = Inches(2.8)
    card_h = Inches(1.8)
    gap = Inches(0.5)
    start_x = (SLIDE_W - 4*card_w - 3*gap) / 2

    for i, (val, label, color) in enumerate(stats):
        cx = start_x + i*(card_w + gap)
        bg = colored_box(slide, cx, Inches(2.6), card_w, card_h, DEEP_PANEL)
        bg.line.color.rgb = rgb_to_pptx(*color)
        bg.line.width = Pt(2)
        add_textbox(slide, val,
                    cx, Inches(2.65), card_w, Inches(0.85),
                    font_size=38, bold=True, color=color, align=PP_ALIGN.CENTER)
        add_textbox(slide, label,
                    cx, Inches(3.5), card_w, Inches(0.75),
                    font_size=11, bold=False, color=LIGHT_GRAY, align=PP_ALIGN.CENTER)

    # Tech stack footer
    stack = "React 19 · TypeScript · Vite · Expo SDK 57 · React Native · Express 5 · MongoDB 7 · Mongoose · Docker · NGINX · Zustand · ZXing · JWT · bcryptjs · Helmet"
    add_textbox(slide, stack,
                Inches(0.3), Inches(5.7), SLIDE_W - Inches(0.6), Inches(0.5),
                font_size=10, bold=False, color=LIGHT_GRAY, align=PP_ALIGN.CENTER)

    add_textbox(slide, "GitHub: Fresh-Mart/supermarket-self-billing  ·  Full-Stack Retail Engineering — September 2026",
                Inches(0), Inches(6.35), SLIDE_W, Inches(0.45),
                font_size=12, bold=False, color=GOLD, align=PP_ALIGN.CENTER)


# ─── BUILD ──────────────────────────────────────────────────────────────────

def build():
    prs = Presentation()
    prs.slide_width  = SLIDE_W
    prs.slide_height = SLIDE_H

    blank_layout = prs.slide_layouts[6]  # blank

    builders = [
        slide01_hero,
        slide02_problem,
        slide03_solution,
        slide04_actors,
        slide05_arch_divider,
        slide06_layers,
        slide07_docker,
        slide08_workflow_divider,
        slide09_sequence,
        slide10_state_machine,
        slide11_mobile_divider,
        slide12_mobile_arch,
        slide13_data_divider,
        slide14_er,
        slide15_eng_divider,
        slide16_oop,
        slide17_decorators,
        slide18_typescript,
        slide19_security,
        slide20_closing,
    ]

    for i, fn in enumerate(builders, 1):
        slide = prs.slides.add_slide(blank_layout)
        fn(slide, prs)
        print(f"  ✓ Slide {i:02d} — {fn.__name__}")

    out = r"c:\temp\React\superMarket_SBilling\docs\FreshMart_Final.pptx"
    prs.save(out)
    print(f"\n✅  Saved: {out}")
    print(f"   {len(builders)} slides generated")

if __name__ == "__main__":
    print("Building FreshMart_Final.pptx …")
    build()
