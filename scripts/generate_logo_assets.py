import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_clausora_svg(path, size=512):
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}" fill="none">
  <defs>
    <linearGradient id="cla-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="50%" stop-color="#4338CA" />
      <stop offset="100%" stop-color="#7C3AED" />
    </linearGradient>
    <linearGradient id="cla-accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="100%" stop-color="#22D3EE" />
    </linearGradient>
    <linearGradient id="cla-ribbon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="60%" stop-color="#E0E7FF" />
      <stop offset="100%" stop-color="#C7D2FE" />
    </linearGradient>
    <filter id="cla-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#312E81" flood-opacity="0.5" />
    </filter>
  </defs>

  <!-- Ambient Shadow & Rounded Squircle Container -->
  <rect x="24" y="24" width="{size - 48}" height="{size - 48}" rx="108" fill="url(#cla-bg)" filter="url(#cla-shadow)"/>
  <rect x="24" y="24" width="{size - 48}" height="{size - 48}" rx="108" stroke="#A5B4FC" stroke-opacity="0.35" stroke-width="4"/>

  <!-- Geometric C-Ribbon Curve (Bilateral Contract & Escrow Enclosure) -->
  <path d="M 360 155 C 325 118 280 98 225 98 C 138 98 68 168 68 256 C 68 344 138 414 225 414 C 280 414 325 394 360 357" 
        stroke="url(#cla-ribbon)" stroke-width="36" stroke-linecap="round" fill="none"/>

  <!-- Inner Verification Check & Work DNA Assurance Vector -->
  <path d="M 195 260 L 240 305 L 340 185" 
        stroke="url(#cla-accent)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" fill="none"/>

  <!-- Bilateral Counterpart Nexus Nodes -->
  <!-- Top Node (Client Handshake) -->
  <circle cx="360" cy="155" r="24" fill="#38BDF8"/>
  <circle cx="360" cy="155" r="10" fill="#FFFFFF"/>

  <!-- Bottom Node (Provider Handshake) -->
  <circle cx="360" cy="357" r="24" fill="#C084FC"/>
  <circle cx="360" cy="357" r="10" fill="#FFFFFF"/>

  <!-- Dynamic Verification Pulse Pip -->
  <circle cx="240" cy="305" r="8" fill="#FFFFFF" opacity="0.9"/>
</svg>'''
    with open(path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    print(f"Generated SVG: {path}")


def create_clausora_png(path, size=512):
    # Render crisp raster image using Pillow
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    scale = size / 512.0
    
    # Background squircle
    margin = int(24 * scale)
    radius = int(108 * scale)
    
    # Generate background with gradient
    bg_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg_img)
    
    # Draw rounded rectangle
    bg_draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=radius,
        fill=(79, 70, 229, 255),
        outline=(165, 180, 252, 90),
        width=max(1, int(4 * scale))
    )
    
    # Blend with diagonal gradient
    for y in range(size):
        for x in range(size):
            r, g, b, a = bg_img.getpixel((x, y))
            if a > 0:
                t = (x + y) / (2.0 * size)
                # #4F46E5 (79, 70, 229) to #7C3AED (124, 58, 237)
                nr = int(79 + (124 - 79) * t)
                ng = int(70 + (58 - 70) * t)
                nb = int(229 + (237 - 229) * t)
                bg_img.putpixel((x, y), (nr, ng, nb, a))
                
    img = Image.alpha_composite(img, bg_img)
    draw = ImageDraw.Draw(img)
    
    # Draw C-Ribbon Curve using sampled points
    pts = []
    # Elliptical arc on left
    cx = int(225 * scale)
    cy = int(256 * scale)
    rx = int(157 * scale)
    ry = int(158 * scale)
    
    start_angle = -1.05 * math.pi
    end_angle = 1.05 * math.pi
    steps = 100
    
    # Draw C arc
    c_stroke = int(36 * scale)
    for i in range(steps):
        theta = -0.75 * math.pi - (i / steps) * (1.5 * math.pi)
        px = cx + rx * math.cos(theta)
        py = cy + ry * math.sin(theta)
        pts.append((px, py))
        
    for i in range(len(pts) - 1):
        draw.line([pts[i], pts[i+1]], fill=(255, 255, 255, 255), width=c_stroke)
        draw.ellipse([pts[i][0] - c_stroke//2, pts[i][1] - c_stroke//2, pts[i][0] + c_stroke//2, pts[i][1] + c_stroke//2], fill=(255, 255, 255, 255))
        
    # Draw checkmark: (195, 260) -> (240, 305) -> (340, 185)
    chk_stroke = int(34 * scale)
    p1 = (int(195 * scale), int(260 * scale))
    p2 = (int(240 * scale), int(305 * scale))
    p3 = (int(340 * scale), int(185 * scale))
    
    # Cyan accent checkmark
    draw.line([p1, p2], fill=(56, 189, 248, 255), width=chk_stroke)
    draw.line([p2, p3], fill=(34, 211, 238, 255), width=chk_stroke)
    for p in [p1, p2, p3]:
        draw.ellipse([p[0] - chk_stroke//2, p[1] - chk_stroke//2, p[0] + chk_stroke//2, p[1] + chk_stroke//2], fill=(45, 200, 243, 255))
        
    # Nodes:
    # Top Node at (360, 155)
    top_node = (int(360 * scale), int(155 * scale))
    r_outer = int(24 * scale)
    r_inner = int(10 * scale)
    draw.ellipse([top_node[0] - r_outer, top_node[1] - r_outer, top_node[0] + r_outer, top_node[1] + r_outer], fill=(56, 189, 248, 255))
    draw.ellipse([top_node[0] - r_inner, top_node[1] - r_inner, top_node[0] + r_inner, top_node[1] + r_inner], fill=(255, 255, 255, 255))
    
    # Bottom Node at (360, 357)
    bot_node = (int(360 * scale), int(357 * scale))
    draw.ellipse([bot_node[0] - r_outer, bot_node[1] - r_outer, bot_node[0] + r_outer, bot_node[1] + r_outer], fill=(192, 132, 252, 255))
    draw.ellipse([bot_node[0] - r_inner, bot_node[1] - r_inner, bot_node[0] + r_inner, bot_node[1] + r_inner], fill=(255, 255, 255, 255))
    
    # Pip at check vertex
    r_pip = int(8 * scale)
    draw.ellipse([p2[0] - r_pip, p2[1] - r_pip, p2[0] + r_pip, p2[1] + r_pip], fill=(255, 255, 255, 240))
    
    img.save(path, format="PNG")
    print(f"Generated PNG ({size}x{size}): {path}")
    return img


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    web_public = os.path.join(root, "apps", "web", "public")
    docs_dir = os.path.join(root, "docs")
    doc_dir = os.path.join(root, "doc")
    
    os.makedirs(web_public, exist_ok=True)
    os.makedirs(docs_dir, exist_ok=True)
    os.makedirs(doc_dir, exist_ok=True)

    # 1. SVGs
    create_clausora_svg(os.path.join(web_public, "logo.svg"), size=512)
    create_clausora_svg(os.path.join(web_public, "favicon.svg"), size=48)
    create_clausora_svg(os.path.join(docs_dir, "logo.svg"), size=512)
    create_clausora_svg(os.path.join(doc_dir, "logo.svg"), size=512)

    # 2. Master PNGs
    master_img = create_clausora_png(os.path.join(web_public, "logo.png"), size=512)
    create_clausora_png(os.path.join(docs_dir, "logo.png"), size=512)
    create_clausora_png(os.path.join(doc_dir, "logo.png"), size=512)

    # 3. Favicon PNG (64x64)
    fav_64 = master_img.resize((64, 64), Image.Resampling.LANCZOS)
    fav_64.save(os.path.join(web_public, "favicon.png"), format="PNG")

    # 4. Favicon ICO (16x16, 32x32, 48x48)
    fav_sizes = [(16, 16), (32, 32), (48, 48)]
    master_img.save(
        os.path.join(web_public, "favicon.ico"),
        format="ICO",
        sizes=fav_sizes
    )
    print("Generated favicon.ico successfully.")

if __name__ == "__main__":
    main()
