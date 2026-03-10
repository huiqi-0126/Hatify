import json
from pathlib import Path
from datetime import datetime

# Paths
DATA_FILE = Path("h:/git/zhongwei/hatify/src/data/blog.json")
SITEMAP_FILE = Path("h:/git/zhongwei/hatify/public/sitemap.xml")
BASE_URL = "https://customhat.top"

def generate_sitemap():
    # 1. Load blog data (already cleaned to only contain show: true)
    if not DATA_FILE.exists():
        print(f"Error: {DATA_FILE} not found.")
        return
        
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            articles = json.load(f)
    except Exception as e:
        print(f"Error loading {DATA_FILE}: {e}")
        return

    # 2. Start building sitemap XML content
    now = datetime.now().strftime("%Y-%m-%d")
    
    xml_content = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '  <url>',
        f'    <loc>{BASE_URL}/</loc>',
        f'    <lastmod>{now}</lastmod>',
        '    <changefreq>weekly</changefreq>',
        '    <priority>1.0</priority>',
        '  </url>'
    ]

    # 3. Add blog post URLs
    for art in articles:
        # Assuming ID as the router param for blog page
        blog_id = art.get("id")
        if blog_id:
            # Check if there's a specific date in the article
            pub_date = art.get("date") or now
            
            xml_content.extend([
                '  <url>',
                f'    <loc>{BASE_URL}/blog/{blog_id}</loc>',
                f'    <lastmod>{pub_date}</lastmod>',
                '    <changefreq>monthly</changefreq>',
                '    <priority>0.8</priority>',
                '  </url>'
            ])

    xml_content.append('</urlset>')

    # 4. Save to public/sitemap.xml
    try:
        with open(SITEMAP_FILE, "w", encoding="utf-8") as f:
            f.write("\n".join(xml_content))
        print(f"Successfully generated sitemap: {SITEMAP_FILE} with {len(articles)} blog entries.")
    except Exception as e:
        print(f"Error saving {SITEMAP_FILE}: {e}")

if __name__ == "__main__":
    generate_sitemap()
