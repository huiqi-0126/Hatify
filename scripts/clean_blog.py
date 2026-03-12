import json
import shutil
import os
from pathlib import Path

# Paths
DATA_FILE = Path("h:/git/zhongwei/hatify/src/data/blog.json")
BLOG_CONTENT_BASE = Path("h:/git/zhongwei/hatify/public/blog_content")
BLOG_SOURCE_BASE = Path("h:/git/zhongwei/hatify/public/blog")

def clean_blog():
    if not DATA_FILE.exists():
        print(f"Error: {DATA_FILE} not found.")
        return

    # 1. Load blog data
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            articles = json.load(f)
    except Exception as e:
        print(f"Error loading {DATA_FILE}: {e}")
        return

    initial_count = len(articles)
    keep_articles = []
    removed_folders = []

    # 2. Identify folders to clean up (extracted assets)
    for art in articles:
        if art.get("show") is not True:
            # Metadata for cleaning up extracted folder in public/blog_content
            folder_name = art.get("folder")
            if folder_name:
                removed_folders.append({
                    "folder": folder_name
                })

    # 3. Save blog.json (we keep everything to prevent re-scanning)
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(articles, f, indent=2, ensure_ascii=False)
        print(f"Updated {DATA_FILE}: Synced metadata. Total: {len(articles)} articles.")
    except Exception as e:
        print(f"Error saving {DATA_FILE}: {e}")
        return

    # 4. Delete extracted content folders only (to save space)
    for item in removed_folders:
        folder_name = item["folder"]

        # Delete from public/blog_content
        content_path = BLOG_CONTENT_BASE / folder_name
        if content_path.exists() and content_path.is_dir():
            print(f"  Cleaning up content assets: {content_path}")
            try:
                shutil.rmtree(content_path)
            except Exception as e:
                print(f"    Failed to delete {content_path}: {e}")

if __name__ == "__main__":
    clean_blog()
