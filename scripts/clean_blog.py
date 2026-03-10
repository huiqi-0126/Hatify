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

    # 2. Identify articles to keep and folders to remove
    for art in articles:
        if art.get("show") is True:
            keep_articles.append(art)
        else:
            # Metadata for removal
            folder_name = art.get("folder")
            date_folder = art.get("from_folder_date")
            
            if folder_name:
                removed_folders.append({
                    "folder": folder_name,
                    "date": date_folder
                })

    # 3. Save updated blog.json
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(keep_articles, f, indent=2, ensure_ascii=False)
        print(f"Updated {DATA_FILE}: Kept {len(keep_articles)} articles (Removed {initial_count - len(keep_articles)}).")
    except Exception as e:
        print(f"Error saving {DATA_FILE}: {e}")
        return

    # 4. Delete folders
    for item in removed_folders:
        folder_name = item["folder"]
        date_folder = item["date"]

        # Delete from public/blog_content
        content_path = BLOG_CONTENT_BASE / folder_name
        if content_path.exists() and content_path.is_dir():
            print(f"  Deleting content folder: {content_path}")
            try:
                shutil.rmtree(content_path)
            except Exception as e:
                print(f"    Failed to delete {content_path}: {e}")

        # Delete from public/blog (source)
        if date_folder:
            source_path = BLOG_SOURCE_BASE / date_folder / folder_name
            if source_path.exists() and source_path.is_dir():
                print(f"  Deleting source folder: {source_path}")
                try:
                    shutil.rmtree(source_path)
                except Exception as e:
                    print(f"    Failed to delete {source_path}: {e}")
            else:
                # Handle potential date format mismatch (e.g. 2026-03-06 vs 2026-3-6)
                try:
                    parts = date_folder.split('-')
                    if len(parts) == 3:
                        norm_date = f"{parts[0]}-{int(parts[1])}-{int(parts[2])}"
                        source_path_norm = BLOG_SOURCE_BASE / norm_date / folder_name
                        if source_path_norm.exists() and source_path_norm.is_dir():
                            print(f"  Deleting source folder (normed): {source_path_norm}")
                            shutil.rmtree(source_path_norm)
                except Exception:
                    pass

if __name__ == "__main__":
    clean_blog()
