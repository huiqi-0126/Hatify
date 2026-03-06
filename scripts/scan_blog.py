import os
import json
import re
import shutil
import requests
from bs4 import BeautifulSoup
from pathlib import Path
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Set up Gemini
API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyD-_EHQl6jeaSanb-7oisf5wnTESCtVcU4")
genai.configure(api_key=API_KEY)

PERMANENT_BASE = Path("public/blog_content")
DATA_FILE = Path("src/data/blog.json")

def pre_clean_html(soup):
    # Unwrap noscript to expose lazy-loaded imgs
    for noscript in soup.find_all('noscript'):
        noscript.unwrap()

    # Decompose definitely useless tags
    for tag in soup.find_all(['script', 'style', 'nav', 'header', 'footer', 'button', 'form', 'svg', 'iframe', 'head', 'meta', 'link']):
        tag.decompose()
        
    # Remove attributes from most tags to save tokens
    for tag in soup.find_all(True):
        if tag.name != 'img':
            tag.attrs = {}
            
    # Remove empty tags
    for tag in soup.find_all(['div', 'span', 'p']):
        if not tag.get_text(strip=True) and not tag.find('img'):
            tag.decompose()
            
    return str(soup)

def extract_blog_data(html_path, folder_name):
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    # Get original metadata as fallback
    title_text = ""
    title_tag = soup.find('title')
    if title_tag:
         title_text = title_tag.get_text().replace("Real Thread", "").replace("|", "").strip()
    
    desc = soup.find('meta', attrs={'name': 'description'})
    desc_text = desc['content'] if desc else ""
    
    og_image = soup.find('meta', attrs={'property': 'og:image'})
    image_url_fallback = og_image['content'] if og_image else ""
    
    # Establish permanent assets directory & copy local assets
    article_assets_dest = PERMANENT_BASE / folder_name / "assets"
    os.makedirs(article_assets_dest, exist_ok=True)
    
    src_assets_dir = Path(html_path).parent / "assets"
    if src_assets_dir.exists():
        for item in src_assets_dir.iterdir():
            if item.is_file():
                shutil.copy2(item, article_assets_dest / item.name)

    # 1. Pre-clean the HTML to reduce token usage and noise
    cleaned_html = pre_clean_html(soup)

    # 2. Ask Gemini to extract the core content
    print(f"  Sending to Gemini...")
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config={
            "temperature": 0.1,
            "response_mime_type": "application/json",
        }
    )
    
    prompt = f"""
    You are an expert web scraper and content extractor.
    Extract the main article content, title, and description from the provided HTML.
    
    Return a JSON object exactly matching this structure:
    {{
       "title": "The exact article title",
       "description": "A 1-2 sentence summary of the article",
       "content_html": "The cleaned HTML of the main body"
    }}
    
    Rules for content_html:
    1. ONLY include the main article content (headings, paragraphs, lists, images).
    2. STRICTLY EXCLUDE: navigation menus, sidebars, related posts, comments, author bios, social sharing widgets, advertising, date/read-time metadata, and marketing CTAs (like 'Read more', 'Contact us').
    3. Remove ALL `<a>` tags (hyperlinks). If the text inside the `<a>` tag is an essential part of a sentence, keep the text without the tag. If the `<a>` tag is a standalone button like 'Shop Now', remove it entirely.
    4. Keep ALL `<img>` tags belonging to the article. You must find the correct image URL (check `data-lazy-src`, `data-src`, or `src` in that order) and output it as the ONLY attribute `src="..."`.
    5. Do not include `<html>`, `<body>`, or `<main>` wrappers. Just return a string containing the sequence of content tags.
    
    HTML:
    {cleaned_html}
    """
    
    try:
        response = model.generate_content(prompt)
        result = json.loads(response.text)
        
        extracted_title = result.get('title', title_text)
        extracted_desc = result.get('description', desc_text)
        content_html = result.get('content_html', '')
        
    except Exception as e:
        print(f"  Gemini extraction failed: {e}. Returning empty content.")
        extracted_title = title_text
        extracted_desc = desc_text
        content_html = "<p>Extraction failed.</p>"

    # 3. Post-process extracted HTML for image localization
    soup_final = BeautifulSoup(content_html, 'html.parser')
    web_rel_base = f"blog_content/{folder_name}/assets"
    
    local_first_img = ""
    imgs = soup_final.find_all('img')
    
    for img in imgs:
        src = img.get('src', '')
        if not src or src.startswith('data:'):
            img.decompose()
            continue
            
        filename = os.path.basename(src.split('?')[0])
        if not filename or any(px in filename.lower() for px in ['pixel', 'tracking', 'ads', 'svg']):
            img.decompose()
            continue
            
        abs_asset_path = article_assets_dest / filename
        
        # Download external images
        if src.startswith('http'):
            if not abs_asset_path.exists():
                try:
                    print(f"  Downloading external asset: {src}")
                    resp = requests.get(src, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
                    if resp.status_code == 200:
                        with open(abs_asset_path, 'wb') as f_out:
                            f_out.write(resp.content)
                except Exception as e:
                    print(f"  Download error: {e}")
                    
        # Filter tiny images < 1KB that snuck through
        if abs_asset_path.exists() and abs_asset_path.stat().st_size < 1000:
            print(f"  Filtering small asset: {filename}")
            img.decompose()
            continue
            
        # Standardize img attributes
        new_src = f"{web_rel_base}/{filename}"
        img.attrs = {
            'src': new_src,
            'alt': img.get('alt', ''),
            'style': "max-width: 100%; height: auto; border-radius: 24px; margin: 48px 0; display: block;",
            'class': "shadow-2xl"
        }
        if not local_first_img:
            local_first_img = new_src

    # Finally, remove any leftover URLs in text nodes (just to be safe)
    content_str = str(soup_final)
    url_pattern = re.compile(r'https?://[^\s<>"]+|www\.[^\s<>"]+')
    temp_soup = BeautifulSoup(content_str, 'html.parser')
    for text_node in temp_soup.find_all(string=True):
        if text_node.parent.name not in ['script', 'style', 'a']:
            new_text = url_pattern.sub('', text_node)
            text_node.replace_with(new_text)

    return {
        "title": extracted_title.strip() or "Untitled Article",
        "description": extracted_desc.strip(),
        "image": local_first_img or image_url_fallback,
        "content": str(temp_soup),
        "path": f"blog_content/{folder_name}"
    }

def scan_blog():
    existing_articles = []
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                existing_articles = json.load(f)
        except Exception:
            pass

    existing_folders = {a["folder"] for a in existing_articles}
    max_id = max((int(a.get("id", 0)) for a in existing_articles), default=0)

    blog_dir = Path("public/blog")
    if not blog_dir.exists():
        print("Source directory (public/blog) not found.")
        return

    snapshots = sorted(list(blog_dir.glob("**/rendered_snapshot.html")))
    new_count = 0
    
    for snapshot in snapshots:
        folder_name = snapshot.parent.name
        if folder_name in existing_folders:
            continue
            
        print(f"Ingesting new article: {folder_name}...")
        try:
            data = extract_blog_data(str(snapshot), folder_name)
            max_id += 1
            data["id"] = str(max_id)
            data["folder"] = folder_name
            existing_articles.append(data)
            new_count += 1
        except Exception as e:
            print(f"Error processing {folder_name}: {e}")
            
    os.makedirs(DATA_FILE.parent, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(existing_articles, f, indent=2, ensure_ascii=False)
    
    print(f"Scan complete. Added {new_count} new articles. Total: {len(existing_articles)}")

if __name__ == "__main__":
    scan_blog()
