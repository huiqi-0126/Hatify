import os
import json
import re
import shutil
import requests
from bs4 import BeautifulSoup
from pathlib import Path

# 永久存放资源的目录
PERMANENT_BASE = Path("public/blog_content")
DATA_FILE = Path("src/data/blog.json")

def extract_blog_data(html_path, folder_name):
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')
    
    # 建立永久存放路径
    article_assets_dest = PERMANENT_BASE / folder_name / "assets"
    os.makedirs(article_assets_dest, exist_ok=True)
    
    # 源资产路径
    src_assets_dir = Path(html_path).parent / "assets"
    if src_assets_dir.exists():
        for item in src_assets_dir.iterdir():
            if item.is_file():
                shutil.copy2(item, article_assets_dest / item.name)

    # Extract title
    title_text = ""
    title_tag = soup.find('title')
    if title_tag:
        title_text = title_tag.get_text()
    
    h1 = soup.find('h1')
    if h1:
        title_text = h1.get_text()
    
    if "Real Thread" in title_text:
         title_text = title_text.replace("Real Thread", "").replace("|", "").strip()

    # Extract description
    desc = soup.find('meta', attrs={'name': 'description'})
    if not desc:
        desc = soup.find('meta', attrs={'property': 'og:description'})
    desc_text = desc['content'] if desc else ""
    
    # Extract featured image
    image_url = ""
    og_image = soup.find('meta', attrs={'property': 'og:image'})
    if og_image:
        image_url = og_image['content']
    
    # Extract main content
    content_html = ""
    potential_selectors = ['div.rich-text', 'article', 'main', 'div.prose', 'div.content', 'div#content']
    
    content_container = None
    for selector in potential_selectors:
        if '.' in selector:
            tag, cls = selector.split('.')
            content_container = soup.find(tag, class_=cls)
        elif '#' in selector:
            tag, id_ = selector.split('#')
            content_container = soup.find(tag, id=id_)
        else:
            content_container = soup.find(selector)
        
        if content_container and len(content_container.get_text()) > 200:
            break

    if not content_container:
        divs = soup.find_all('div')
        if divs:
            content_container = max(divs, key=lambda d: len(d.find_all('p')))

    if content_container:
        # 1. Unwrap noscript tags
        for noscript in content_container.find_all('noscript'):
            noscript.unwrap()

        # 2. Clean up unwanted tags (non-content)
        for tag in content_container.find_all(['script', 'style', 'nav', 'header', 'footer', 'button', 'form', 'svg', 'iframe']):
            tag.decompose()
        
        # 3. Handle links: User wants plain text, no clickable URLs.
        # We unwrap <a> tags to keep the text BUT remove the link, OR decompose if it's a CTA.
        for a_tag in content_container.find_all('a'):
            a_text = a_tag.get_text().strip()
            # If it's a "Read more" style link, usually it's in its own tag, decompose it.
            ban_words = ["Learn more", "Read more", "Contact us", "All posts", "Start your order", "View all", "Table of contents", "Ready to try", "Get started"]
            if any(word.lower() in a_text.lower() for word in ban_words) and len(a_text) < 60:
                a_tag.decompose()
            else:
                # Keep the text, remove the link
                a_tag.unwrap()

        # 4. Remove empty tags
        for tag in content_container.find_all(['p', 'div', 'span', 'section']):
            if not tag.get_text().strip() and not tag.find_all('img'):
                tag.decompose()

        # 5. Resource migration (images)
        web_rel_base = f"blog_content/{folder_name}/assets"
        imgs = content_container.find_all('img')
        
        local_first_img = ""
        for img in imgs:
            # Handle lazy loading
            src = img.get('data-lazy-src') or img.get('data-src') or img.get('data-original') or img.get('src') or ''
            
            if not src or src.startswith('data:'):
                img.decompose()
                continue

            # Skip tracking pixels
            filename = os.path.basename(src.split('?')[0])
            if not filename or any(px in filename.lower() for px in ['pixel', 'tracking', 'ads']):
                img.decompose()
                continue
                
            abs_asset_path = article_assets_dest / filename
            
            # Download external
            if src.startswith('http'):
                if not abs_asset_path.exists():
                    try:
                        print(f"  Downloading external asset: {src}")
                        resp = requests.get(src, timeout=15, headers={
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                        })
                        if resp.status_code == 200:
                            with open(abs_asset_path, 'wb') as f_out:
                                f_out.write(resp.content)
                        else:
                            print(f"  Failed (Status {resp.status_code})")
                    except Exception as e:
                        print(f"  Download error: {e}")
            
            # Size filter (1KB)
            if abs_asset_path.exists() and abs_asset_path.stat().st_size < 1000:
                print(f"  Filtering small asset: {filename}")
                img.decompose()
                continue

            new_src = f"{web_rel_base}/{filename}"
            # Set cleaned attributes
            img.attrs = {
                'src': new_src,
                'alt': img.get('alt', ''),
                'style': "max-width: 100%; height: auto; border-radius: 24px; margin: 48px 0; display: block;",
                'class': "shadow-2xl"
            }
            if not local_first_img:
                local_first_img = new_src

        # 6. Final Sanitization: Clean up remaining attributes, but keep structure
        allowed_tags = ['div', 'section', 'article', 'main', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'img', 'br', 'b', 'strong', 'i', 'em', 'blockquote']
        for tag in content_container.find_all(True):
            if tag.name not in allowed_tags:
                tag.unwrap() # Keep content, remove tag
            elif tag.name != 'img':
                tag.attrs = {} # Clean attributes for text tags

        # 7. Convert to HTML string and remove leftover URLs from text
        content_html = str(content_container)
        
        # Use a more careful regex or better yet, another BeautifulSoup pass to remove URLs from text nodes only
        temp_soup = BeautifulSoup(content_html, 'html.parser')
        url_pattern = re.compile(r'https?://[^\s<>"]+|www\.[^\s<>"]+')
        for text_node in temp_soup.find_all(text=True):
            if text_node.parent.name != 'a': # Just to be safe
                new_text = url_pattern.sub('', text_node)
                text_node.replace_with(new_text)
        
        content_html = str(temp_soup)

    return {
        "title": title_text.strip() or "Untitled Article",
        "description": desc_text.strip(),
        "image": image_url or local_first_img,
        "content": content_html,
        "path": f"blog_content/{folder_name}"
    }

def scan_blog():
    # 1. 加载现有数据
    existing_articles = []
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                existing_articles = json.load(f)
        except:
            existing_articles = []

    # 记录现有文件夹名称，避免重复导入
    existing_folders = {a["folder"] for a in existing_articles}
    
    # 获取当前最大 ID
    max_id = 0
    if existing_articles:
        max_id = max(int(a["id"]) for a in existing_articles)

    blog_dir = Path("public/blog")
    if not blog_dir.exists():
        print("Source directory (public/blog) not found.")
        return

    # 2. 扫描新文章
    snapshots = sorted(list(blog_dir.glob("**/rendered_snapshot.html")))
    new_count = 0
    
    for snapshot in snapshots:
        folder_name = snapshot.parent.name
        
        # 如果已经存在，跳过（如果您想强制更新，可以去掉这个判断）
        if folder_name in existing_folders:
            print(f"Skipping {folder_name} (already exists).")
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
            
    # 3. 保存合并后的数据
    os.makedirs(DATA_FILE.parent, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(existing_articles, f, indent=2, ensure_ascii=False)
    
    print(f"Scan complete. Added {new_count} new articles. Total: {len(existing_articles)}")

if __name__ == "__main__":
    scan_blog()
