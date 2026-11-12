import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_thank_you_card():
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
    
    # Subtle tech grid on transparent layer to blend smoothly
    for x in range(0, WIDTH, 160):
        glow_draw.line([(x, 0), (x, HEIGHT)], fill=(99, 102, 241, 10), width=1)
    for y in range(0, HEIGHT, 160):
        glow_draw.line([(0, y), (WIDTH, y)], fill=(99, 102, 241, 10), width=1)

    # Emerald celebratory glow behind center
    glow_draw.ellipse([WIDTH // 2 - 500, 120, WIDTH // 2 + 500, 650], fill=(16, 185, 129, 35))
    # Indigo glow on left
    glow_draw.ellipse([100, 220, 680, 750], fill=(79, 70, 229, 35))
    # Violet glow on right
    glow_draw.ellipse([WIDTH - 680, 220, WIDTH - 100, 750], fill=(168, 85, 247, 30))
    
    glow = glow.filter(ImageFilter.GaussianBlur(85))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # Fonts
    font_bold = "C:/Windows/Fonts/segoeuib.ttf"
    font_reg = "C:/Windows/Fonts/segoeui.ttf"

    font_title = ImageFont.truetype(font_bold, 92)
    font_tagline = ImageFont.truetype(font_bold, 36)
    font_subtitle = ImageFont.truetype(font_reg, 22)
    font_badge = ImageFont.truetype(font_bold, 15)
    font_card_badge = ImageFont.truetype(font_bold, 13)
    font_card_title = ImageFont.truetype(font_bold, 24)
    font_card_url = ImageFont.truetype(font_bold, 17)
    font_card_desc = ImageFont.truetype(font_reg, 15)
    font_footer = ImageFont.truetype(font_reg, 17)
    font_footer_bold = ImageFont.truetype(font_bold, 17)

    # 2. Top Header Navigation Bar
    # Hackathon Badge (Left)
    badge_text = "PAYPAL AI HACKATHON 2026 • OFFICIAL SUBMISSION CLOSING"
    badge_bbox = draw.textbbox((0, 0), badge_text, font=font_badge)
    bw = badge_bbox[2] - badge_bbox[0]
    bx1, by1 = 80, 48
    bx2, by2 = bx1 + bw + 32, by1 + (badge_bbox[3] - badge_bbox[1]) + 16
    draw.rounded_rectangle([bx1, by1, bx2, by2], radius=12, fill=(6, 78, 59, 220), outline=(16, 185, 129, 180), width=1)
    draw.text((bx1 + 16, by1 + 8), badge_text, font=font_badge, fill=(167, 243, 208, 255))

    # Cloud Platform Badges (Right)
    right_text = "POWERED BY GOOGLE GEMINI 1.5 PRO & PAYPAL ORDERS V2"
    r_bbox = draw.textbbox((0, 0), right_text, font=font_badge)
    rw = r_bbox[2] - r_bbox[0]
    rx1 = WIDTH - 80 - rw - 32
    ry1 = 48
    rx2, ry2 = WIDTH - 80, ry1 + (r_bbox[3] - r_bbox[1]) + 16
    draw.rounded_rectangle([rx1, ry1, rx2, ry2], radius=12, fill=(30, 27, 75, 220), outline=(99, 102, 241, 180), width=1)
    draw.text((rx1 + 16, ry1 + 8), right_text, font=font_badge, fill=(199, 210, 254, 255))

    # 3. Logo & Main Brand Title
    logo_path = "docs/logo.png"
    logo_y = 125
    if os.path.exists(logo_path):
        try:
            logo_img = Image.open(logo_path).convert("RGBA")
            logo_img = logo_img.resize((96, 96), Image.Resampling.LANCZOS)
            
            glow_box = [WIDTH // 2 - 58, logo_y - 8, WIDTH // 2 + 58, logo_y + 104]
            draw.ellipse(glow_box, fill=(16, 185, 129, 65), outline=(52, 211, 153, 200), width=2)
            
            img.paste(logo_img, (WIDTH // 2 - 48, logo_y), logo_img)
        except Exception as e:
            print("Logo load error:", e)

    # Large Thank You Title
    thank_text = "THANK YOU!"
    t_bbox = draw.textbbox((0, 0), thank_text, font=font_title)
    t_w = t_bbox[2] - t_bbox[0]
    draw.text(((WIDTH - t_w) // 2, 240), thank_text, font=font_title, fill=(255, 255, 255, 255))

    # Tagline: "CLAUSORA — Understand the work. Verify the outcome. Release the payment."
    tagline_part1 = "CLAUSORA  •  "
    tagline_part2 = "Understand the work.  "
    tagline_part3 = "Verify the outcome.  "
    tagline_part4 = "Release the payment."

    tb1 = draw.textbbox((0, 0), tagline_part1, font=font_tagline)
    tb2 = draw.textbbox((0, 0), tagline_part2, font=font_tagline)
    tb3 = draw.textbbox((0, 0), tagline_part3, font=font_tagline)
    tb4 = draw.textbbox((0, 0), tagline_part4, font=font_tagline)
    
    total_tag_w = (tb1[2] - tb1[0]) + (tb2[2] - tb2[0]) + (tb3[2] - tb3[0]) + (tb4[2] - tb4[0])
    start_tag_x = (WIDTH - total_tag_w) // 2
    tag_y = 355

    draw.text((start_tag_x, tag_y), tagline_part1, font=font_tagline, fill=(129, 140, 248, 255))
    x2 = start_tag_x + (tb1[2] - tb1[0])
    draw.text((x2, tag_y), tagline_part2, font=font_tagline, fill=(248, 250, 252, 255))
    x3 = x2 + (tb2[2] - tb2[0])
    draw.text((x3, tag_y), tagline_part3, font=font_tagline, fill=(165, 180, 252, 255))
    x4 = x3 + (tb3[2] - tb3[0])
    draw.text((x4, tag_y), tagline_part4, font=font_tagline, fill=(52, 211, 153, 255))

    # Subtitle
    subtitle_text = "Ready for Production Evaluation  •  Explore the Live Application, Codebase & Documentation"
    s_bbox = draw.textbbox((0, 0), subtitle_text, font=font_subtitle)
    s_w = s_bbox[2] - s_bbox[0]
    draw.text(((WIDTH - s_w) // 2, 420), subtitle_text, font=font_subtitle, fill=(148, 163, 184, 255))

    # 4. Three Resource & Action Cards
    cards = [
        {
            "badge": "LIVE WEB APPLICATION",
            "title": "Interactive Platform",
            "url": "https://clausora.vercel.app",
            "desc": "Experience full multi-role workflows: Client contract baselining, Provider proof uploads, 3-Agent AI Jury reviews, and PayPal Sandbox settlements.",
            "color": (16, 185, 129),
            "accent": (167, 243, 208),
        },
        {
            "badge": "GITHUB OPEN SOURCE",
            "title": "Clean Monorepo",
            "url": "github.com/haritharshini2004/Clausora",
            "desc": "Full production codebase featuring npm workspaces (@clausora/shared, @clausora/api, @clausora/web) with 50 passing automated test suites.",
            "color": (99, 102, 241),
            "accent": (199, 210, 254),
        },
        {
            "badge": "DOCUMENTATION & SPEC",
            "title": "Complete PDF Runbook",
            "url": "clausora.vercel.app/Clausora_Documentation.pdf",
            "desc": "Comprehensive 20-page guide detailing cloud architecture, anti-self-approval mathematical proofs, PayPal Orders v2 integration, and real use cases.",
            "color": (168, 85, 247),
            "accent": (233, 213, 255),
        },
    ]

    card_w = 540
    card_h = 255
    total_cards_w = 3 * card_w + 2 * 40
    start_cx = (WIDTH - total_cards_w) // 2
    cards_y = 495

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
        draw.rounded_rectangle([cx1 + 24, cy1 + 22, cx1 + 240, cy1 + 48], radius=6, fill=(30, 41, 59, 230), outline=c["color"], width=1)
        draw.text((cx1 + 34, cy1 + 26), c["badge"], font=font_card_badge, fill=c["accent"])

        # Title
        draw.text((cx1 + 24, cy1 + 62), c["title"], font=font_card_title, fill=(255, 255, 255, 255))

        # URL Highlight Box
        draw.text((cx1 + 24, cy1 + 98), c["url"], font=font_card_url, fill=c["accent"])

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

        dy = cy1 + 135
        for line in desc_lines:
            draw.text((cx1 + 24, dy), line, font=font_card_desc, fill=(148, 163, 184, 255))
            dy += 24

    # 5. Bottom Modern Footer Bar
    foot_y1 = HEIGHT - 110
    draw.line([(80, foot_y1), (WIDTH - 80, foot_y1)], fill=(30, 41, 59, 255), width=1)

    # Left: Author Info
    draw.text((80, foot_y1 + 20), "Lead Architect & Developer:", font=font_footer, fill=(148, 163, 184, 255))
    draw.text((310, foot_y1 + 20), "Hari Tharshini T", font=font_footer_bold, fill=(255, 255, 255, 255))
    draw.text((80, foot_y1 + 48), "Contact: haritharshinit@gmail.com", font=font_footer, fill=(52, 211, 153, 255))

    # Center: Tech Stack Summary
    stack_text = "Frontend: Vercel  •  Backend: Render  •  Database: MongoDB Atlas  •  Email: Resend  •  AI: Gemini 1.5 Pro"
    st_bbox = draw.textbbox((0, 0), stack_text, font=font_footer)
    st_w = st_bbox[2] - st_bbox[0]
    draw.text(((WIDTH - st_w) // 2, foot_y1 + 34), stack_text, font=font_footer, fill=(100, 116, 139, 255))

    # Right: Verified Badge Pill
    status_text = "VERIFIED: 50/50 TESTS PASSING  [OK]"
    ub_bbox = draw.textbbox((0, 0), status_text, font=font_footer_bold)
    ub_w = ub_bbox[2] - ub_bbox[0]
    ux1 = WIDTH - 80 - ub_w - 32
    uy1 = foot_y1 + 20
    ux2, uy2 = WIDTH - 80, uy1 + 44
    draw.rounded_rectangle([ux1, uy1, ux2, uy2], radius=10, fill=(16, 185, 129, 25), outline=(16, 185, 129, 180), width=1)
    draw.text((ux1 + 16, uy1 + 10), status_text, font=font_footer_bold, fill=(52, 211, 153, 255))

    # Save to docs/ and apps/web/public/
    os.makedirs("docs", exist_ok=True)
    os.makedirs("apps/web/public", exist_ok=True)
    out_docs = "docs/clausora_thank_you_card.png"
    out_web = "apps/web/public/clausora_thank_you_card.png"
    
    img.save(out_docs, "PNG")
    img.save(out_web, "PNG")
    print(f"Thank you card generated: {out_docs} & {out_web}")

if __name__ == "__main__":
    create_thank_you_card()
