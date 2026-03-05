import os
import json
import re
from bs4 import BeautifulSoup
from pathlib import Path

def extract_blog_data(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')
    
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
    
    # List of potential containers in order of preference
    potential_selectors = [
        'article',
        'main',
        'div.rich-text',
        'div.prose',
        'div.content',
        'div#content'
    ]
    
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
        # Fallback: find the div with most paragraphs
        divs = soup.find_all('div')
        if divs:
            content_container = max(divs, key=lambda d: len(d.find_all('p')))

    if content_container:
        # Clean up
        for tag in content_container.find_all(['script', 'style', 'nav', 'header', 'footer', 'noscript']):
            tag.decompose()
        
        rel_base = "/" + str(Path(html_path).parent.relative_to(Path("public"))).replace("\\", "/")
        
        imgs = content_container.find_all('img')
        for img in imgs:
            src = img.get('src')
            if src:
                if src.startswith('./'):
                    img['src'] = rel_base + "/" + src[2:]
                elif src.startswith('assets/'):
                    img['src'] = rel_base + "/" + src
                elif not src.startswith(('http', '/')):
                    img['src'] = rel_base + "/" + src
            
            # Remove complex styles that might break layout
            if img.get('style'):
                img['style'] = "max-width: 100%; height: auto; border-radius: 12px; margin: 24px 0;"
            img['class'] = "rounded-2xl shadow-md my-8 w-full object-cover"

        # Fallback for cover image if not found in meta
        if not image_url and imgs:
            image_url = imgs[0].get('src')

        # Remove empty tags
        for p in content_container.find_all('p'):
            if not p.get_text().strip() and not p.find_all('img'):
                p.decompose()

        content_html = str(content_container)

    return {
        "title": title_text.strip() or "Untitled Article",
        "description": desc_text.strip(),
        "image": image_url,
        "content": content_html,
        "path": rel_base
    }

def scan_blog():
    blog_dir = Path("public/blog")
    articles = []
    
    if not blog_dir.exists():
        print("Blog directory not found!")
        return

    # Sort to keep numeric IDs consistent
    snapshots = sorted(list(blog_dir.glob("**/rendered_snapshot.html")))
    
    for i, snapshot in enumerate(snapshots):
        folder_name = snapshot.parent.name
        print(f"Processing {folder_name}...")
        try:
            data = extract_blog_data(str(snapshot))
            data["id"] = str(i + 1) # Numeric ID
            data["folder"] = folder_name
            articles.append(data)
        except Exception as e:
            print(f"Error processing {folder_name}: {e}")
            
    os.makedirs("src/data", exist_ok=True)
    with open("src/data/blog.json", "w", encoding="utf-8") as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)
    
    print(f"Total articles processed: {len(articles)}")

if __name__ == "__main__":
    scan_blog()
