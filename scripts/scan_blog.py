import os
import json
import re
import shutil
from bs4 import BeautifulSoup
from pathlib import Path

# 永久存放资源的目录
PERMANENT_BASE = Path("public/blog_content")

def clean_text_patterns(html_str):
    # 彻底删除包含常见营销词汇的标签或文本块
    patterns = [
        r'Learn more', 
        r'Read more', 
        r'Check it out', 
        r'Click here', 
        r'Start your order',
        r'Contact us',
        r'View selection',
        r'All posts',
        r'More Articles',
        r'Related articles'
    ]
    
    # 移除 URL (http/https)
    html_str = re.sub(r'https?://[^\s<>"]+|www\.[^\s<>"]+', '', html_str)
    
    # 针对特定的文本模式，如果它们还在 HTML 里，尝试清理
    # 注意：直接正则替换 HTML 可能会破坏标签结构，所以我们尽量在 BeautifulSoup 层面处理
    return html_str

def extract_blog_data(html_path, article_id, folder_name):
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
        # 1. 第一轮清理：已知标签
        for tag in content_container.find_all(['script', 'style', 'nav', 'header', 'footer', 'noscript', 'button', 'form', 'svg']):
            tag.decompose()
        
        # 2. 第二轮清理：所有 <a> 标签及其文字
        for a_tag in content_container.find_all('a'):
            a_tag.decompose()

        # 3. 第三轮清理：包含特定营销文字的标签 (Learn more, etc.)
        ban_words = ["Learn more", "Read more", "Contact us", "All posts", "Start your order", "View all"]
        for tag in content_container.find_all(True):
            text = tag.get_text().strip()
            if any(word.lower() in text.lower() for word in ban_words):
                if tag.name not in ['body', 'html', 'main', 'article']: # 保护根容器
                    # 如果该标签内基本只有这些禁用词，则删除
                    if len(text) < 50:
                        tag.decompose()

        # 4. 清理侧边栏和额外部分
        for cls_to_remove in ['md:sticky', 'share-links', 'related-articles', 'author-section', 'sidebar']:
            for tag in content_container.find_all(class_=re.compile(cls_to_remove)):
                tag.decompose()

        # 5. 资源路径迁移
        web_rel_base = f"/blog_content/{folder_name}/assets"
        imgs = content_container.find_all('img')
        for img in imgs:
            src = img.get('src', '')
            filename = os.path.basename(src)
            img['src'] = f"{web_rel_base}/{filename}"
            img['style'] = "max-width: 100%; height: auto; border-radius: 24px; margin: 48px 0; display: block;"
            img['class'] = "shadow-2xl"

        # 6. 处理封面图
        if image_url:
            if "http" not in image_url:
                image_url = f"{web_rel_base}/{os.path.basename(image_url)}"
        elif imgs:
             image_url = imgs[0].get('src')

        # 7. 去掉所有干扰属性
        for tag in content_container.find_all(True):
            if tag.name not in ['img']:
                tag.attrs = {}

        # 8. 转换为字符串并进行最后的正则清洗 (清除残留 URL)
        content_html = str(content_container)
        content_html = re.sub(r'https?://[^\s<>"]+|www\.[^\s<>"]+', '', content_html)

    return {
        "title": title_text.strip() or "Untitled Article",
        "description": desc_text.strip(),
        "image": image_url,
        "content": content_html,
        "path": f"/blog_content/{folder_name}"
    }

def scan_blog():
    blog_dir = Path("public/blog")
    articles = []
    
    if not blog_dir.exists():
        print("Source directory not found, keeping existing data.")
        return

    snapshots = sorted(list(blog_dir.glob("**/rendered_snapshot.html")))
    
    for i, snapshot in enumerate(snapshots):
        folder_name = snapshot.parent.name
        print(f"Deep cleaning and ingesting {folder_name}...")
        try:
            data = extract_blog_data(str(snapshot), str(i + 1), folder_name)
            data["id"] = str(i + 1)
            data["folder"] = folder_name
            articles.append(data)
        except Exception as e:
            print(f"Error processing {folder_name}: {e}")
            
    os.makedirs("src/data", exist_ok=True)
    with open("src/data/blog.json", "w", encoding="utf-8") as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)
    
    print(f"Total articles deep cleaned: {len(articles)}")

if __name__ == "__main__":
    scan_blog()
