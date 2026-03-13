"""
build_knowledge_base.py

Builds a vector knowledge base from:
1. blog.json articles (HTML -> plaintext, chunked by H2/H3)
2. FAQ Q&A pairs from i18n.ts
3. Website brand & product info
4. gallery.json product data

Usage: python scripts/build_knowledge_base.py
"""

import json
import os
import re
import sqlite3
import struct
import sys
import time
from html.parser import HTMLParser
from pathlib import Path

from dotenv import load_dotenv

# Load env from project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY not found in .env")
    sys.exit(1)

try:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY)
except ImportError:
    print("ERROR: google-generativeai not installed. Run: pip install google-generativeai python-dotenv")
    sys.exit(1)

DB_PATH = PROJECT_ROOT / "knowledge.db"
BLOG_JSON = PROJECT_ROOT / "src" / "data" / "blog.json"
GALLERY_JSON = PROJECT_ROOT / "src" / "data" / "gallery.json"
I18N_FILE = PROJECT_ROOT / "src" / "i18n.ts"

EMBEDDING_MODEL = "models/gemini-embedding-001"
EMBEDDING_DIM = 3072
BATCH_SIZE = 20  # Gemini batch embedding limit
RATE_LIMIT_DELAY = 1.5  # seconds between batches


# ============================================================
# HTML to Plain Text
# ============================================================
class HTMLStripper(HTMLParser):
    """Convert HTML to plain text, preserving heading markers."""

    def __init__(self):
        super().__init__()
        self.result = []
        self.current_tag = None

    def handle_starttag(self, tag, attrs):
        self.current_tag = tag
        if tag in ("h1", "h2", "h3", "h4"):
            self.result.append(f"\n## " if tag in ("h2", "h3") else f"\n### ")
        elif tag in ("p", "li", "div"):
            self.result.append("\n")
        elif tag == "br":
            self.result.append("\n")

    def handle_endtag(self, tag):
        if tag in ("h1", "h2", "h3", "h4", "p", "div"):
            self.result.append("\n")
        self.current_tag = None

    def handle_data(self, data):
        text = data.strip()
        if text:
            self.result.append(text + " ")


def html_to_text(html: str) -> str:
    """Strip HTML tags and return clean text."""
    stripper = HTMLStripper()
    stripper.feed(html)
    text = "".join(stripper.result)
    # Clean up multiple newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


# ============================================================
# Content Chunking
# ============================================================
def chunk_article(article: dict) -> list[dict]:
    """Split article content into semantic chunks by H2/H3 sections."""
    chunks = []
    text = html_to_text(article.get("content", ""))
    title = article.get("title", "")
    tags = article.get("tags", [])
    article_id = str(article.get("id", ""))

    # Split by ## headers
    sections = re.split(r'\n(##+ .+)\n', text)

    current_header = title
    current_content = ""

    for part in sections:
        part = part.strip()
        if not part:
            continue
        if part.startswith("## ") or part.startswith("### "):
            # Save previous chunk if it has content
            if current_content.strip() and len(current_content.strip()) > 50:
                chunks.append({
                    "source": "blog",
                    "article_id": article_id,
                    "section": current_header,
                    "content": f"{current_header}\n\n{current_content.strip()}",
                    "tags": tags,
                })
            current_header = part.lstrip("# ").strip()
            current_content = ""
        else:
            current_content += part + "\n"

    # Don't forget the last chunk
    if current_content.strip() and len(current_content.strip()) > 50:
        chunks.append({
            "source": "blog",
            "article_id": article_id,
            "section": current_header,
            "content": f"{current_header}\n\n{current_content.strip()}",
            "tags": tags,
        })

    # If no sections found, treat entire text as one chunk
    if not chunks and text.strip():
        chunks.append({
            "source": "blog",
            "article_id": article_id,
            "section": title,
            "content": f"{title}\n\n{text[:2000]}",
            "tags": tags,
        })

    return chunks


def extract_faq_chunks() -> list[dict]:
    """Extract FAQ Q&A pairs from i18n.ts (English)."""
    chunks = []
    try:
        content = I18N_FILE.read_text(encoding="utf-8")
        # Extract English FAQ entries
        for i in range(1, 31):
            q_match = re.search(rf'"q{i}":\s*"([^"]+)"', content)
            a_match = re.search(rf'"a{i}":\s*"([^"]+)"', content)
            if q_match and a_match:
                q = q_match.group(1)
                a = a_match.group(1)
                chunks.append({
                    "source": "faq",
                    "article_id": f"faq_{i}",
                    "section": f"FAQ #{i}",
                    "content": f"Question: {q}\n\nAnswer: {a}",
                    "tags": ["FAQ", "Customer Service"],
                })
    except Exception as e:
        print(f"  Warning: Could not extract FAQ: {e}")
    return chunks


def extract_brand_chunks() -> list[dict]:
    """Create knowledge chunks from brand/website information."""
    brand_info = [
        {
            "section": "About Hatify",
            "content": (
                "About Hatify\n\n"
                "Hatify is a premium custom hat design studio specializing in personalized headwear. "
                "We offer custom embroidered hats, leather patch hats, PVC patches, and more. "
                "Our products include baseball caps, trucker hats, bucket hats, beanies, snapbacks, "
                "dad hats, five-panel caps, and fashion women's hats. "
                "We use 100% custom embroidery - no cheap printing methods. "
                "Every Hatify hat features premium brushed cotton twill with pre-curved visors "
                "and adjustable brass buckle closures. "
                "We serve individual customers and businesses with no minimum order requirements. "
                "Website: https://customhat.top"
            ),
            "tags": ["Brand", "About Us"],
        },
        {
            "section": "Hat Styles Available",
            "content": (
                "Hat Styles Available at Hatify\n\n"
                "Base styles: Fashion Women's Hat, Baseball/Peaked Cap, Trucker Cap, "
                "Bucket Hat, Beanie, 5-Panel/6-Panel, Curved Brim, Flat Brim.\n"
                "Materials: Cotton Canvas, Washed Cotton, Mesh, Wool, Suede, Polyester, Fleece/Lined.\n"
                "Craftsmanship options: Embroidery (3D/Flat), Print (Heat Transfer/DTG), "
                "Leather Patch, Rubber Patch, Woven Label, Gold/Silver Foil.\n"
                "Design positions: Front, Left Side, Right Side, Back, Under Brim, Inner Band, Top.\n"
                "Size adjustments: Snap/Velcro, Elastic, Fixed (S/M/L), Kids/Adults/Large head.\n"
                "Personalized details: Custom Label, Custom Lanyard, Custom Button Color, Custom Eyelets."
            ),
            "tags": ["Products", "Hat Styles"],
        },
        {
            "section": "Pricing and Services",
            "content": (
                "Hatify Pricing and Services\n\n"
                "Custom hat pricing: $35 - $85 per hat. Free shipping on orders over $50. "
                "Bulk discounts available for orders of 10+ hats. "
                "Processing time: 3-5 business days. Shipping: 3-5 additional days. "
                "Bulk orders: 10-15 business days.\n"
                "Services: Free design preview, digital proof before production, "
                "design assistance, 2-year warranty, tarnish-free guarantee.\n"
                "One-time digitizing fee for custom logos (waived for 50+ hat orders).\n"
                "Custom inner labels available for 50+ hat orders.\n"
                "Payment: Visa, MasterCard, Amex, PayPal, Apple Pay.\n"
                "International shipping available worldwide."
            ),
            "tags": ["Pricing", "Services"],
        },
        {
            "section": "Use Cases & Scenarios",
            "content": (
                "Custom Hat Use Cases and Scenarios\n\n"
                "Team uniforms and sports events, Corporate branding and company swag, "
                "Wedding parties and special events, Streetwear and fashion brands, "
                "Family reunions and group trips, Fundraising merchandise, "
                "Promotional giveaways, Employee uniforms, "
                "Band and music merchandise, School and university spirit wear."
            ),
            "tags": ["Use Cases", "Marketing"],
        },
    ]
    return [
        {
            "source": "brand",
            "article_id": f"brand_{i}",
            "section": info["section"],
            "content": info["content"],
            "tags": info["tags"],
        }
        for i, info in enumerate(brand_info)
    ]


def extract_gallery_chunks() -> list[dict]:
    """Extract product information from gallery.json."""
    chunks = []
    try:
        raw_data = json.loads(GALLERY_JSON.read_text(encoding="utf-8"))
        items = raw_data.get("data", {}).get("list", [])
        # Group similar products or take top items
        for i, item in enumerate(items[:30]):  # Top 30 products
            name = item.get("name", item.get("title", f"Product {i}"))
            desc = item.get("description", "")
            details = item.get("details", "")
            style = item.get("style", "")
            material = item.get("material", "")
            
            content_parts = [f"Product: {name}"]
            if desc:
                content_parts.append(f"Description: {desc}")
            if style:
                content_parts.append(f"Style: {style}")
            if material:
                content_parts.append(f"Material: {material}")
            if details:
                content_parts.append(f"Details: {details}")
            
            combined = "\n".join(content_parts)
            if len(combined) > 30:
                chunks.append({
                    "source": "gallery",
                    "article_id": f"gallery_{i}",
                    "section": name,
                    "content": combined,
                    "tags": ["Product", "Gallery"],
                })
    except Exception as e:
        print(f"  Warning: Could not extract gallery data: {e}")
    return chunks


# ============================================================
# Embedding
# ============================================================
def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Get embeddings from Gemini API in batches."""
    all_embeddings = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        try:
            result = genai.embed_content(
                model=EMBEDDING_MODEL,
                content=batch,
                task_type="RETRIEVAL_DOCUMENT",
            )
            all_embeddings.extend(result['embedding'])
            if i + BATCH_SIZE < len(texts):
                time.sleep(RATE_LIMIT_DELAY)
        except Exception as e:
            print(f"  Embedding error at batch {i}: {e}")
            # Retry once
            time.sleep(3)
            try:
                result = genai.embed_content(
                    model=EMBEDDING_MODEL,
                    content=batch,
                    task_type="RETRIEVAL_DOCUMENT",
                )
                all_embeddings.extend(result['embedding'])
            except Exception as e2:
                print(f"  Retry also failed: {e2}")
                # Fill with zeros for failed chunks
                all_embeddings.extend([[0.0] * EMBEDDING_DIM] * len(batch))
    return all_embeddings


def serialize_vector(vector: list[float]) -> bytes:
    """Serialize a float vector into bytes for SQLite storage."""
    return struct.pack(f'{len(vector)}f', *vector)


# ============================================================
# Database
# ============================================================
def init_db(conn: sqlite3.Connection):
    """Initialize knowledge base database tables."""
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            article_id TEXT,
            section TEXT,
            content TEXT NOT NULL,
            tags TEXT,
            embedding BLOB,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT NOT NULL,
            url TEXT UNIQUE,
            title TEXT NOT NULL,
            description TEXT,
            asked_at TEXT,
            answer_count INTEGER DEFAULT 0,
            relevance_score REAL DEFAULT 0,
            matched_tags TEXT,
            status TEXT DEFAULT 'new',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER REFERENCES questions(id),
            content TEXT NOT NULL,
            content_en TEXT,
            sources TEXT,
            language TEXT DEFAULT 'zh',
            status TEXT DEFAULT 'draft',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_chunks_source ON chunks(source);
        CREATE INDEX IF NOT EXISTS idx_chunks_article ON chunks(article_id);
        CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
        CREATE INDEX IF NOT EXISTS idx_questions_platform ON questions(platform);
        CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
        CREATE INDEX IF NOT EXISTS idx_answers_status ON answers(status);
    """)


# ============================================================
# Main Build
# ============================================================
def main():
    print("=" * 60)
    print("Building Knowledge Base")
    print("=" * 60)

    # 1. Collect all chunks
    all_chunks = []

    # Blog articles
    print("\n[1/4] Processing blog articles...")
    try:
        blog_data = json.loads(BLOG_JSON.read_text(encoding="utf-8"))
        visible_articles = [a for a in blog_data if a.get("show", False)]
        print(f"  Found {len(visible_articles)} visible articles")
        for article in visible_articles:
            chunks = chunk_article(article)
            all_chunks.extend(chunks)
            print(f"  Article '{article.get('title', '?')[:50]}...' -> {len(chunks)} chunks")
    except Exception as e:
        print(f"  ERROR loading blog.json: {e}")

    # FAQ
    print("\n[2/4] Processing FAQ entries...")
    faq_chunks = extract_faq_chunks()
    all_chunks.extend(faq_chunks)
    print(f"  Extracted {len(faq_chunks)} FAQ entries")

    # Brand info
    print("\n[3/4] Processing brand information...")
    brand_chunks = extract_brand_chunks()
    all_chunks.extend(brand_chunks)
    print(f"  Created {len(brand_chunks)} brand info chunks")

    # Gallery
    print("\n[4/4] Processing gallery products...")
    gallery_chunks = extract_gallery_chunks()
    all_chunks.extend(gallery_chunks)
    print(f"  Extracted {len(gallery_chunks)} product chunks")

    print(f"\n  Total chunks: {len(all_chunks)}")

    # 2. Generate embeddings
    print("\n[Embedding] Generating vector embeddings...")
    texts = [c["content"] for c in all_chunks]
    embeddings = get_embeddings(texts)
    print(f"  Generated {len(embeddings)} embeddings")

    # 3. Save to database
    print(f"\n[DB] Saving to {DB_PATH}...")
    conn = sqlite3.connect(str(DB_PATH))
    init_db(conn)

    # Clear existing chunks (rebuild)
    conn.execute("DELETE FROM chunks")

    cursor = conn.cursor()
    for chunk, embedding in zip(all_chunks, embeddings):
        cursor.execute(
            "INSERT INTO chunks (source, article_id, section, content, tags, embedding) VALUES (?, ?, ?, ?, ?, ?)",
            (
                chunk["source"],
                chunk["article_id"],
                chunk["section"],
                chunk["content"],
                json.dumps(chunk["tags"]),
                serialize_vector(embedding),
            ),
        )

    conn.commit()

    # Verify
    count = conn.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]
    print(f"  Saved {count} chunks to database")

    conn.close()
    print("\n✅ Knowledge base built successfully!")
    print(f"   Database: {DB_PATH}")


if __name__ == "__main__":
    main()
