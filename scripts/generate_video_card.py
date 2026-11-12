import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_front_card():
    WIDTH, HEIGHT = 1920, 1080
    
    # 1. Base Gradient Canvas (#070913 to #0F172A)
    img = Image.new("RGBA", (WIDTH, HEIGHT), (11, 15, 25, 255))
    draw = ImageDraw.Draw(img)

    for y in range(HEIGHT):
        ratio = y / HEIGHT
        r = int(7 + ratio * 8)
        g = int(9 + ratio * 10)
        b = int(18 + ratio * 18)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b, 255))

    # Ambient Radial Glow Layer
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    
    # Subtle grid on transparent layer to blend properly
    for x in range(0, WIDTH, 160):
        glow_draw.line([(x, 0), (x, HEIGHT)], fill=(99, 102, 241, 10), width=1)
    for y in range(0, HEIGHT, 160):
        glow_draw.line([(0, y), (WIDTH, y)], fill=(99, 102, 241, 10), width=1)

    # Glowing radial spheres
    glow_draw.ellipse([WIDTH // 2 - 550, 100, WIDTH // 2 + 550, 650], fill=(79, 70, 229, 45))
    glow_draw.ellipse([80, 220, 680, 750], fill=(6, 182, 212, 25))
    glow_draw.ellipse([WIDTH - 680, 220, WIDTH - 80, 750], fill=(16, 185, 129, 22))
    
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # Fonts
    font_bold = "C:/Windows/Fonts/segoeuib.ttf"
    font_reg = "C:/Windows/Fonts/segoeui.ttf"

    font_title = ImageFont.truetype(font_bold, 96)
    font_tagline = ImageFont.truetype(font_bold, 38)
    font_subtitle = ImageFont.truetype(font_reg, 22)
    font_badge = ImageFont.truetype(font_bold, 15)
    font_card_badge = ImageFont.truetype(font_bold, 14)
    font_card_title = ImageFont.truetype(font_bold, 22)
    font_card_desc = ImageFont.truetype(font_reg, 16)
    font_footer = ImageFont.truetype(font_reg, 17)
    font_footer_bold = ImageFont.truetype(font_bold, 17)

    # 2. Top Header Navigation Bar
    # Hackathon Badge (Left)
    badge_text = "BUILT FOR PAYPAL AI HACKATHON 2026 • ORDERS V2 SANDBOX"
    badge_bbox = draw.textbbox((0, 0), badge_text, font=font_badge)
    bw = badge_bbox[2] - badge_bbox[0]
    bx1, by1 = 80, 48
    bx2, by2 = bx1 + bw + 32, by1 + (badge_bbox[3] - badge_bbox[1]) + 16
    draw.rounded_rectangle([bx1, by1, bx2, by2], radius=12, fill=(30, 27, 75, 230), outline=(99, 102, 241, 180), width=1)
    draw.text((bx1 + 16, by1 + 8), badge_text, font=font_badge, fill=(199, 210, 254, 255))

    # Cloud Platform Badges (Right)
    right_text = "VERCEL  •  RENDER  •  MONGODB ATLAS  •  GEMINI 1.5 PRO"
    r_bbox = draw.textbbox((0, 0), right_text, font=font_badge)
    rw = r_bbox[2] - r_bbox[0]
    rx1 = WIDTH - 80 - rw - 32
    ry1 = 48
    rx2, ry2 = WIDTH - 80, ry1 + (r_bbox[3] - r_bbox[1]) + 16
    draw.rounded_rectangle([rx1, ry1, rx2, ry2], radius=12, fill=(15, 23, 42, 230), outline=(51, 65, 85, 200), width=1)
    draw.text((rx1 + 16, ry1 + 8), right_text, font=font_badge, fill=(148, 163, 184, 255))

    # 3. Logo & Main Brand Title
    logo_path = "docs/logo.png"
    logo_y = 135
    if os.path.exists(logo_path):
        try:
            logo_img = Image.open(logo_path).convert("RGBA")
            logo_img = logo_img.resize((104, 104), Image.Resampling.LANCZOS)
            
            glow_box = [WIDTH // 2 - 62, logo_y - 8, WIDTH // 2 + 62, logo_y + 112]
            draw.ellipse(glow_box, fill=(79, 70, 229, 70), outline=(129, 140, 248, 200), width=2)
            
            img.paste(logo_img, (WIDTH // 2 - 52, logo_y), logo_img)
        except Exception as e:
            print("Logo load error:", e)

    # Title "CLAUSORA"
    title_text = "CLAUSORA"
    t_bbox = draw.textbbox((0, 0), title_text, font=font_title)
    t_w = t_bbox[2] - t_bbox[0]
    draw.text(((WIDTH - t_w) // 2, 255), title_text, font=font_title, fill=(255, 255, 255, 255))

    # Tagline: "Understand the work. Verify the outcome. Release the payment."
    tagline_part1 = "Understand the work.  "
    tagline_part2 = "Verify the outcome.  "
    tagline_part3 = "Release the payment."

    tag_bbox1 = draw.textbbox((0, 0), tagline_part1, font=font_tagline)
    tag_bbox2 = draw.textbbox((0, 0), tagline_part2, font=font_tagline)
    tag_bbox3 = draw.textbbox((0, 0), tagline_part3, font=font_tagline)
    
    total_tag_w = (tag_bbox1[2] - tag_bbox1[0]) + (tag_bbox2[2] - tag_bbox2[0]) + (tag_bbox3[2] - tag_bbox3[0])
    start_tag_x = (WIDTH - total_tag_w) // 2
    tag_y = 375

    draw.text((start_tag_x, tag_y), tagline_part1, font=font_tagline, fill=(248, 250, 252, 255))
    x2 = start_tag_x + (tag_bbox1[2] - tag_bbox1[0])
    draw.text((x2, tag_y), tagline_part2, font=font_tagline, fill=(165, 180, 252, 255))
    x3 = x2 + (tag_bbox2[2] - tag_bbox2[0])
    draw.text((x3, tag_y), tagline_part3, font=font_tagline, fill=(52, 211, 153, 255))

    # Core Subtitle
    subtitle_text = "AI Work Intelligence  •  Evidence Verification Graph  •  3-Agent AI Jury  •  PayPal Orders v2 Escrow"
    s_bbox = draw.textbbox((0, 0), subtitle_text, font=font_subtitle)
    s_w = s_bbox[2] - s_bbox[0]
    draw.text(((WIDTH - s_w) // 2, 440), subtitle_text, font=font_subtitle, fill=(148, 163, 184, 255))

    # 4. Three Core Architectural Pillars Cards
    cards = [
        {
            "tag": "1. WORK DNA ENGINE",
            "title": "Multimodal Synthesis & Radar",
            "desc": "Google Gemini 1.5 Pro & Qwen2.5-VL transforms raw briefs into modular tasks, testable criteria, and a 9-dim risk register with multilingual token support.",
            "color": (99, 102, 241),
            "accent": (165, 180, 252),
        },
        {
            "tag": "2. BILATERAL GOVERNANCE",
            "title": "SHA-256 Baseline & AI Jury",
            "desc": "Anti-Self-Approval mathematical theorem prevents unilateral manipulation. Autonomous 3-agent jury audits architecture, security, and QA validity.",
            "color": (168, 85, 247),
            "accent": (216, 180, 254),
        },
        {
            "tag": "3. ESCROW SETTLEMENT",
            "title": "PayPal Orders v2 Release",
            "desc": "Deterministic proof-before-payout milestone releases with direct server-side capture verification, split payouts, and tamper-evident audit logging.",
            "color": (16, 185, 129),
            "accent": (110, 231, 183),
        },
    ]

    card_w = 540
    card_h = 245
    total_cards_w = 3 * card_w + 2 * 40
    start_cx = (WIDTH - total_cards_w) // 2
    cards_y = 515

    for idx, c in enumerate(cards):
        cx1 = start_cx + idx * (card_w + 40)
        cy1 = cards_y
        cx2 = cx1 + card_w
        cy2 = cy1 + card_h

        # Solid background card
        draw.rounded_rectangle([cx1, cy1, cx2, cy2], radius=18, fill=(15, 23, 42, 245), outline=(51, 65, 85, 220), width=1)
        
        # Color bar on top of card
        draw.rounded_rectangle([cx1 + 24, cy1, cx1 + 140, cy1 + 3], radius=2, fill=c["color"])

        # Tag Badge
        draw.rounded_rectangle([cx1 + 24, cy1 + 22, cx1 + 230, cy1 + 48], radius=6, fill=(30, 41, 59, 230), outline=c["color"], width=1)
        draw.text((cx1 + 34, cy1 + 26), c["tag"], font=font_card_badge, fill=c["accent"])

        # Title
        draw.text((cx1 + 24, cy1 + 64), c["title"], font=font_card_title, fill=(255, 255, 255, 255))

        # Description wrapped
        desc_lines = []
        words = c["desc"].split(" ")
        cur_line = ""
        for w in words:
            test_line = (cur_line + " " + w).strip()
            tb = draw.textbbox((0, 0), test_line, font=font_card_desc)
            if (tb[2] - tb[0]) <= (card_w - 48):
                cur_line = test_line
            else:
                desc_lines.append(cur_line)
                cur_line = w
        if cur_line:
            desc_lines.append(cur_line)

        dy = cy1 + 110
        for line in desc_lines:
            draw.text((cx1 + 24, dy), line, font=font_card_desc, fill=(148, 163, 184, 255))
            dy += 26

    # 5. Bottom Modern Footer Bar
    foot_y1 = HEIGHT - 110
    draw.line([(80, foot_y1), (WIDTH - 80, foot_y1)], fill=(30, 41, 59, 255), width=1)

    # Left: Author Info
    draw.text((80, foot_y1 + 20), "Lead Architect & Author:", font=font_footer, fill=(148, 163, 184, 255))
    draw.text((290, foot_y1 + 20), "Hari Tharshini T", font=font_footer_bold, fill=(255, 255, 255, 255))
    draw.text((80, foot_y1 + 48), "Contact: haritharshinit@gmail.com", font=font_footer, fill=(129, 140, 248, 255))

    # Center: Tech Stack Summary
    stack_text = "Frontend: Vercel  •  Backend: Render  •  Database: MongoDB Atlas  •  Email: Resend  •  AI: Gemini 1.5 Pro"
    st_bbox = draw.textbbox((0, 0), stack_text, font=font_footer)
    st_w = st_bbox[2] - st_bbox[0]
    draw.text(((WIDTH - st_w) // 2, foot_y1 + 34), stack_text, font=font_footer, fill=(100, 116, 139, 255))

    # Right: Live URL Pill
    url_text = "LIVE APP: clausora.vercel.app  >>"
    ub_bbox = draw.textbbox((0, 0), url_text, font=font_footer_bold)
    ub_w = ub_bbox[2] - ub_bbox[0]
    ux1 = WIDTH - 80 - ub_w - 32
    uy1 = foot_y1 + 20
    ux2, uy2 = WIDTH - 80, uy1 + 44
    draw.rounded_rectangle([ux1, uy1, ux2, uy2], radius=10, fill=(16, 185, 129, 25), outline=(16, 185, 129, 180), width=1)
    draw.text((ux1 + 16, uy1 + 10), url_text, font=font_footer_bold, fill=(52, 211, 153, 255))

    # Save to both docs/ and apps/web/public/
    os.makedirs("docs", exist_ok=True)
    os.makedirs("apps/web/public", exist_ok=True)
    out_docs = "docs/clausora_video_front_card.png"
    out_web = "apps/web/public/clausora_video_front_card.png"
    
    img.save(out_docs, "PNG")
    img.save(out_web, "PNG")
    print(f"Generated successfully: {out_docs} & {out_web}")

if __name__ == "__main__":
    create_front_card()
