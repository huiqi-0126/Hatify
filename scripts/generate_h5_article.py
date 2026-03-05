
import os
import shutil
from bs4 import BeautifulSoup
from pathlib import Path

def generate_h5():
    # Paths
    base_dir = Path(r"H:\git\zhongwei\hatify")
    src_dir = base_dir / "public" / "blog" / "article_11"
    html_file = src_dir / "LH Ovulation Rapid Test — Famwell.html"
    files_dir = src_dir / "LH Ovulation Rapid Test — Famwell_files"
    output_html = base_dir / "public" / "lh-ovulation-test.html"
    output_assets_dir = base_dir / "public" / "lh-ovulation-test_files"
    
    os.makedirs(output_assets_dir, exist_ok=True)

    # 1. Parse HTML
    with open(html_file, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f, "html.parser")

    # --- Extractions ---
    title = "LH Ovulation Rapid Test"
    title_tag = soup.find("h1", class_="product-title")
    if title_tag:
        title = title_tag.get_text().strip()

    # Intro Section
    intro_div = soup.find("div", class_="product-description")
    intro_html = ""
    if intro_div:
        # Strip links as requested
        for a in intro_div.find_all("a"):
            a.replace_with(a.get_text())
        intro_html = "".join([str(p) for p in intro_div.find_all("p")])

    # Detail Sections (The missing parts)
    additional_section = soup.find("section", class_="ProductItem-additional")
    detail_html = ""
    
    def process_img(src):
        if not src: return None
        filename = os.path.basename(src).split('?')[0]
        # Look for local file
        match = files_dir / filename
        if not match.exists():
            # Try fuzzy match (squarespace often adds (1) etc)
            for f in files_dir.iterdir():
                if f.name.startswith(filename.split('.')[0]) and f.suffix.lower() == match.suffix.lower():
                    match = f
                    break
        if match.exists():
            shutil.copy2(match, output_assets_dir / match.name)
            return f"lh-ovulation-test_files/{match.name}"
        return None

    if additional_section:
        # Process blocks
        for block in additional_section.find_all("div", class_="sqs-block"):
            block_type = block.get("data-block-type")
            
            # Text Blocks
            if block_type == "2":
                content_div = block.find("div", class_="sqs-html-content")
                if content_div:
                    # Remove scripts
                    for s in content_div.find_all("script"): s.decompose()
                    # Strip links as requested
                    for a in content_div.find_all("a"):
                        a.replace_with(a.get_text())
                    # Fix images if any inside text
                    for img in content_div.find_all("img"):
                        new_src = process_img(img.get("src") or img.get("data-src"))
                        if new_src: img['src'] = new_src
                    
                    detail_html += f'<div class="detail-block text-block">{str(content_div)}</div>'
            
            # Image Blocks
            elif block_type == "5":
                img_tag = block.find("img")
                if img_tag:
                    new_src = process_img(img_tag.get("src") or img_tag.get("data-src"))
                    if new_src:
                        detail_html += f'<div class="detail-block image-block"><img src="{new_src}" alt="Instruction Image"></div>'

    # Hero Slider Images
    hero_images = []
    gallery = soup.find("div", class_="product-gallery-slides")
    if gallery:
        for img in gallery.find_all("img"):
            new_src = process_img(img.get("src") or img.get("data-src"))
            if new_src:
                hero_images.append(os.path.basename(new_src))
    
    # Logo
    logo_src = files_dir / "Untitled+design+(4).png"
    logo_url = ""
    if logo_src.exists():
        shutil.copy2(logo_src, output_assets_dir / "logo.png")
        logo_url = "lh-ovulation-test_files/logo.png"

    # --- Template Generation ---
    h5_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title} - Famwell</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Inter:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {{
            --primary: #000000;
            --accent: #E53935;
            --bg: #F8F9FA;
            --text: #1A1A1A;
            --muted: #666666;
            --card-bg: #FFFFFF;
        }}

        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}

        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            line-height: 1.6;
            overflow-x: hidden;
        }}

        h1, h2, h3, h4 {{
            font-family: 'Outfit', sans-serif;
            font-weight: 600;
            margin-bottom: 0.5em;
        }}

        .container {{
            max-width: 500px;
            margin: 0 auto;
            background: var(--card-bg);
            min-height: 100vh;
            box-shadow: 0 0 40px rgba(0,0,0,0.05);
            position: relative;
        }}

        header {{
            padding: 15px 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            position: sticky;
            top: 0;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            z-index: 100;
            border-bottom: 1px solid #eee;
        }}

        .logo {{
            height: 28px;
        }}

        .hero-carousel {{
            position: relative;
            width: 100%;
            aspect-ratio: 1/1;
            overflow: hidden;
            background: #fff;
        }}

        .carousel-inner {{
            display: flex;
            transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            height: 100%;
        }}

        .carousel-item {{
            min-width: 100%;
            height: 100%;
        }}

        .carousel-item img {{
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 10px;
        }}

        .carousel-dots {{
            position: absolute;
            bottom: 15px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 8px;
        }}

        .dot {{
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: rgba(0,0,0,0.1);
        }}

        .dot.active {{
            background: var(--primary);
            width: 15px;
            border-radius: 3px;
        }}

        .content-section {{
            padding: 24px;
        }}

        .product-badge {{
            display: inline-block;
            background: #EEF2F6;
            color: #475569;
            padding: 4px 12px;
            border-radius: 100px;
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 12px;
            text-transform: uppercase;
        }}

        h1.title {{
            font-size: 28px;
            margin-bottom: 16px;
            color: var(--primary);
        }}

        .intro-text {{
            font-size: 15px;
            color: var(--muted);
            margin-bottom: 30px;
        }}

        .intro-text p {{ margin-bottom: 12px; }}

        /* Detail Blocks */
        .detail-block {{
            margin-top: 30px;
            border-top: 1px solid #f0f0f0;
            padding-top: 30px;
        }}

        .detail-block h4 {{
            font-size: 20px;
            color: var(--primary);
            margin-bottom: 20px;
        }}

        .detail-block p {{
            margin-bottom: 15px;
            font-size: 15px;
            color: #444;
        }}

        .detail-block ul {{
            margin-left: 20px;
            margin-bottom: 20px;
        }}

        .detail-block li {{
            margin-bottom: 8px;
            font-size: 14px;
        }}

        .detail-block img {{
            width: 100%;
            border-radius: 12px;
            margin: 10px 0;
            display: block;
        }}

        .footer {{
            padding: 40px 24px;
            text-align: center;
            font-size: 12px;
            color: #94A3B8;
            border-top: 1px solid #F1F5F9;
            margin-top: 40px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <img src="{logo_url}" alt="Famwell" class="logo">
        </header>

        <section class="hero-carousel">
            <div class="carousel-inner" id="carouselInner">
                {"".join([f'<div class="carousel-item"><img src="lh-ovulation-test_files/{img}" alt="Product"></div>' for img in hero_images])}
            </div>
            <div class="carousel-dots" id="carouselDots">
                {"".join([f'<div class="dot {"active" if i==0 else ""}" onclick="goToSlide({i})"></div>' for i in range(len(hero_images))])}
            </div>
        </section>

        <section class="content-section">
            <span class="product-badge">Fertility Solutions</span>
            <h1 class="title">{title}</h1>
            <div class="intro-text">
                {intro_html}
            </div>

            <div class="details-container">
                {detail_html}
            </div>
        </section>

        <footer class="footer">
            &copy; 2025 Famwell Inc. All rights reserved.<br>
            Designed for better fertility outcomes.
        </footer>
    </div>

    <script>
        let currentSlide = 0;
        const inner = document.getElementById('carouselInner');
        const dots = document.querySelectorAll('.dot');
        const totalSlides = {len(hero_images)};

        function goToSlide(n) {{
            currentSlide = n;
            inner.style.transform = `translateX(-${{currentSlide * 100}}%)`;
            dots.forEach((dot, idx) => {{
                dot.classList.toggle('active', idx === currentSlide);
            }});
        }}

        setInterval(() => {{
            if(totalSlides > 0) goToSlide((currentSlide + 1) % totalSlides);
        }}, 4000);
    </script>
</body>
</html>"""

    with open(output_html, "w", encoding="utf-8") as f:
        f.write(h5_template)
    
    print(f"H5 page generated at: {output_html}")

if __name__ == "__main__":
    generate_h5()
