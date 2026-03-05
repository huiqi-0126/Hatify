import os
import json
import re
import shutil
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
        # Clean up unwanted tags
        for tag in content_container.find_all(['script', 'style', 'nav', 'header', 'footer', 'noscript', 'button', 'form', 'svg']):
            tag.decompose()
        
        # 彻底删除所有 <a> 标签及其文字
        for a_tag in content_container.find_all('a'):
            a_tag.decompose()

        # 第三轮清理：包含特定营销文字的标签 (Learn more, etc.)
        ban_words = ["Learn more", "Read more", "Contact us", "All posts", "Start your order", "View all"]
        for tag in content_container.find_all(True):
            text = tag.get_text().strip()
            if any(word.lower() in text.lower() for word in ban_words):
                if tag.name not in ['body', 'html', 'main', 'article']: # 保护根容器
                    if len(text) < 50:
                        tag.decompose()

        # 清理侧边栏和额外部分
        for cls_to_remove in ['md:sticky', 'share-links', 'related-articles', 'author-section', 'sidebar']:
            for tag in content_container.find_all(class_=re.compile(cls_to_remove)):
                tag.decompose()

        # 资源路径迁移
        web_rel_base = f"/blog_content/{folder_name}/assets"
        imgs = content_container.find_all('img')
        for img in imgs:
            src = img.get('src', '')
            filename = os.path.basename(src)
            img['src'] = f"{web_rel_base}/{filename}"
            img['style'] = "max-width: 100%; height: auto; border-radius: 24px; margin: 48px 0; display: block;"
            img['class'] = "shadow-2xl"

        # 处理封面图
        if image_url:
            if "http" not in image_url:
                image_url = f"{web_rel_base}/{os.path.basename(image_url)}"
        elif imgs:
             image_url = imgs[0].get('src')

        # 去掉所有干扰属性
        for tag in content_container.find_all(True):
            if tag.name not in ['img']:
                tag.attrs = {}

        # 转换为字符串并整理
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
