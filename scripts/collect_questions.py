"""
collect_questions.py

Collects hat-related questions from Zhihu and Quora using Gemini googleSearch.
Scores relevance against the knowledge base and stores in knowledge.db.

Usage: python scripts/collect_questions.py [--platform zhihu|quora|all]
"""

import json
import os
import re
import sqlite3
import struct
import sys
import time
import requests
from bs4 import BeautifulSoup
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("ERROR: GEMINI_API_KEY not found in .env")
    sys.exit(1)

try:
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=GEMINI_API_KEY)
except ImportError:
    print("ERROR: google-genai not installed.")
    sys.exit(1)

DB_PATH = PROJECT_ROOT / "knowledge.db"
EMBEDDING_MODEL = "models/gemini-embedding-001"
EMBEDDING_DIM = 3072


# ============================================================
# Search Keywords per Platform
# ============================================================
ZHIHU_SEARCHES = [
    "定制帽子 刺绣",
    "企业定制帽子 logo",
    "棒球帽定制 小批量",
    "帽子刺绣 设计",
    "定制渔夫帽",
    "团队帽子定制",
    "婚礼帽子定制",
    "帽子打样",
    "定制冷帽 beanie",
    "品牌帽子定制 工厂",
]

QUORA_SEARCHES = [
    "custom embroidered hats",
    "how to design custom hat logo",
    "best custom hat company",
    "custom trucker hats small order",
    "custom beanie embroidery",
    "custom patch hats leather",
    "custom hat for wedding party",
    "team custom caps design",
    "custom hat business tips",
    "embroidery vs print hats",
]

REDDIT_SEARCHES = [
    "custom hat embroidery Reddit r/embroidery",
    "best place for custom hats Reddit r/streetwearstartup",
    "custom trucker hats recommendations Reddit",
    "embroidered patches for hats Reddit",
    "custom beanie design advice Reddit",
    "small batch custom hats Reddit",
    "personalized hats for gifts Reddit",
]


# ============================================================
# Gemini Search
# ============================================================
def search_questions(platform: str, query: str) -> list[dict]:
    """Use Gemini googleSearch to find questions on a platform."""
    sites = {
        "zhihu": "zhihu.com",
        "quora": "quora.com",
        "reddit": "reddit.com"
    }
    site = sites.get(platform, "google.com")
    lang_instruction = "用中文回答" if platform == "zhihu" else "Answer in English"

    prompt = f"""Use Google Search to find REAL, ACTIVE questions on {site} regarding "{query}".
We are strictly looking for questions about hat customization, embroidery, caps, or headwear design.

CRITICAL INSTRUCTIONS:
1. ONLY use actual URLs and titles found in the Google Search results.
2. DO NOT mix up titles from one result with URLs from another. Keep the 1:1 mapping strict.
3. DISCARD any results that are not relevant to hats (e.g., do not return math or programming questions if they appear).
4. Do NOT hallucinate or guess URLs.

{lang_instruction}

Return a JSON array of 4-5 distinct questions. Each object MUST have:
- "title": the EXACT question title from the search result.
- "url": the EXACT full URL from the search result.
- "description": 1-2 sentences summarizing the specific question content.
- "answer_count": approx number of comments/replies/answers.

Search Query: "{query} site:{site}"

Return ONLY the JSON array. Do not include any preamble or explanation.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())]
            )
        )
        resp_text = response.text or ""
        return parse_json_response(resp_text)
    except Exception as e:
        print(f"    Search error for '{query}': {e}")
        return []


def parse_json_response(text: str) -> list[dict]:
    """Parse JSON array from potentially messy AI response."""
    # Clean markdown code blocks
    clean = re.sub(r'```json\s*|```\s*', '', text).strip()

    # Find JSON array
    start = clean.find('[')
    end = clean.rfind(']')
    if start == -1 or end == -1:
        return []

    try:
        return json.loads(clean[start:end + 1])
    except json.JSONDecodeError:
        # Try to fix common issues
        json_str = clean[start:end + 1]
        # Fix trailing commas
        json_str = re.sub(r',\s*]', ']', json_str)
        json_str = re.sub(r',\s*}', '}', json_str)
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            return []


def is_url_active(url: str, platform: str) -> bool:
    """Check if a URL is still active and not removed (especially for Reddit)."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/"
        }
        resp = requests.get(url, headers=headers, timeout=10)
        
        # If we get 403, Reddit is blocking our bot. 
        # In this case, we can't check the text for "removed" markers easily.
        # We will assume it's OK for now but print a warning.
        if resp.status_code == 403:
            print(f"      Validation: Got 403 for {url} (Probably bot-blocked, keeping to be safe)")
            return True
            
        if resp.status_code != 200:
            return False

        if platform == "reddit":
            # Check for common "removed" indicators in the HTML
            soup = BeautifulSoup(resp.text, "html.parser")
            text = soup.get_text().lower()
            # Reddit specific "removed" markers
            removed_markers = [
                "sorry, this post was removed",
                "sorry, this post has been removed",
                "post was removed by reddit's filters",
                "account has been suspended",
                "original poster has deleted this account",
            ]
            for marker in removed_markers:
                if marker in text:
                    return False
        
        elif platform == "zhihu":
            # Check for "page not found" or "invalid" on Zhihu
            if "该内容已被删除" in resp.text or "页面不存在" in resp.text:
                return False
                
        return True
    except Exception as e:
        print(f"      Validation error for {url}: {e}")
        return True  # Default to True if we can't check, to avoid missing good links


# ============================================================
# Relevance Scoring
# ============================================================
def compute_relevance(question_text: str, conn: sqlite3.Connection) -> tuple[float, list[str]]:
    """Score how relevant a question is to our knowledge base using embedding similarity."""
    try:
        # Get question embedding
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=question_text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
        )
        q_embedding = result.embeddings[0].values

        # Find top matching chunks
        rows = conn.execute("SELECT id, content, tags, embedding FROM chunks WHERE embedding IS NOT NULL").fetchall()

        scores = []
        for row in rows:
            chunk_embedding = struct.unpack(f'{EMBEDDING_DIM}f', row[3])
            # Cosine similarity
            dot = sum(a * b for a, b in zip(q_embedding, chunk_embedding))
            norm_q = sum(a * a for a in q_embedding) ** 0.5
            norm_c = sum(a * a for a in chunk_embedding) ** 0.5
            if norm_q > 0 and norm_c > 0:
                sim = dot / (norm_q * norm_c)
            else:
                sim = 0
            scores.append((sim, row[1], row[2]))

        scores.sort(key=lambda x: x[0], reverse=True)

        # Overall relevance = average of top 3 similarities
        top_scores = [s[0] for s in scores[:3]]
        relevance = sum(top_scores) / len(top_scores) if top_scores else 0

        # Collect matching tags
        matched_tags = set()
        for _, _, tags_json in scores[:5]:
            try:
                tags = json.loads(tags_json)
                matched_tags.update(tags)
            except (json.JSONDecodeError, TypeError):
                pass

        return round(relevance, 4), list(matched_tags)[:10]

    except Exception as e:
        print(f"    Relevance scoring error: {e}")
        return 0.0, []


# ============================================================
# Main Collection
# ============================================================
def collect(platform: str = "all"):
    conn = sqlite3.Connection(str(DB_PATH))

    # Check if knowledge base exists
    try:
        count = conn.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]
        if count == 0:
            print("ERROR: Knowledge base is empty. Run build_knowledge_base.py first.")
            sys.exit(1)
        print(f"  Knowledge base: {count} chunks loaded")
    except sqlite3.OperationalError:
        print("ERROR: knowledge.db not found or tables missing. Run build_knowledge_base.py first.")
        sys.exit(1)

    platforms = []
    if platform in ("zhihu", "all"):
        platforms.append(("zhihu", ZHIHU_SEARCHES))
    if platform in ("quora", "all"):
        platforms.append(("quora", QUORA_SEARCHES))
    if platform in ("reddit", "all"):
        platforms.append(("reddit", REDDIT_SEARCHES))

    total_new = 0
    total_skipped = 0

    for plat, searches in platforms:
        print(f"\n{'=' * 50}")
        print(f"  Collecting from: {plat.upper()}")
        print(f"{'=' * 50}")

        for query in searches:
            print(f"\n  Searching: '{query}'...")
            questions = search_questions(plat, query)
            print(f"    Found {len(questions)} questions")

            for q in questions:
                title = q.get("title", "").strip()
                url = q.get("url", "").strip()
                desc = q.get("description", "").strip()
                answer_count = q.get("answer_count", 0)

                if not title or not url:
                    continue

                # Secondary filter: Ensure the content is actually about hats/customization
                content_text = (title + " " + desc).lower()
                relevant_keywords = [
                    "hat", "cap", "beanie", "embroidery", "custom", "logo", "patch", "stitch", 
                    "snapback", "headwear", "trucker", "brim", "visor", "needlework", "apparel", "merch",
                    "帽", "刺绣", "定制", "设计", "礼品", "企业", "加工", "定做", "绣花", "印花"
                ]
                if not any(kw in content_text for kw in relevant_keywords):
                    print(f"      Skipped (Irrelevant content: '{title[:30]}...')")
                    total_skipped += 1
                    continue

                # Check for duplicates
                existing = conn.execute("SELECT id FROM questions WHERE url = ?", (url,)).fetchone()
                if existing:
                    total_skipped += 1
                    continue

                # Validate URL is active
                if not is_url_active(url, plat):
                    print(f"      Skipped (URL inactive or content removed)")
                    total_skipped += 1
                    continue

                # Score relevance
                relevance, matched_tags = compute_relevance(f"{title} {desc}", conn)
                print(f"    → '{title[:50]}...' relevance={relevance:.3f}")

                # Only save if relevance > threshold
                if relevance < 0.3:
                    print(f"      Skipped (low relevance)")
                    total_skipped += 1
                    continue

                conn.execute(
                    """INSERT INTO questions
                       (platform, url, title, description, answer_count, relevance_score, matched_tags, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, 'new')""",
                    (plat, url, title, desc, answer_count, relevance, json.dumps(matched_tags)),
                )
                total_new += 1

            conn.commit()
            time.sleep(2)  # Rate limiting between searches

    print(f"\n{'=' * 50}")
    print(f"  Collection complete!")
    print(f"  New questions: {total_new}")
    print(f"  Skipped (duplicate/low relevance): {total_skipped}")
    print(f"{'=' * 50}")

    conn.close()


if __name__ == "__main__":
    platform = "all"
    if len(sys.argv) > 1 and sys.argv[1] == "--platform" and len(sys.argv) > 2:
        platform = sys.argv[2]
    collect(platform)
