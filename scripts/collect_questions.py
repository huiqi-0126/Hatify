"""
collect_questions.py

Collects hat-related questions from Zhihu, Quora, and Reddit.
- Reddit: Uses PullPush API (Pushshift successor) for guaranteed real data
- Zhihu/Quora: Uses Gemini googleSearch with grounding validation
Scores relevance against the knowledge base and stores in knowledge.db.

Usage: python scripts/collect_questions.py [--platform zhihu|quora|reddit|all]
"""

import json
import os
import re
import sqlite3
import struct
import sys
import time
import requests
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

REDDIT_HEADERS = {
    "User-Agent": "python:hatify:v1.0 (hat customization research tool)"
}

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

# Reddit uses direct API search, these are search queries
REDDIT_SEARCHES = [
    "custom hat embroidery",
    "custom hats small batch",
    "hat embroidery machine",
    "custom trucker hat design",
    "custom beanie knit",
    "embroidered patch hat",
    "custom cap logo",
    "hat customization service",
    "personalized hats gift",
    "custom snapback design",
]

# Subreddits to search in for more targeted results
REDDIT_SUBREDDITS = [
    "embroidery",
    "streetwearstartup",
    "hats",
    "smallbusiness",
    "Entrepreneur",
    "sewing",
    "crafts",
]


# ============================================================
# Reddit: Direct API Search (100% Real Data)
# ============================================================
def search_reddit_questions(query: str, subreddit: str = None) -> list[dict]:
    """
    Search Reddit via PullPush API (Pushshift successor).
    Returns posts with GUARANTEED real titles and URLs.
    """
    params = {
        "q": query,
        "size": 10,
        "sort": "desc",
        "sort_type": "score",
    }
    if subreddit:
        params["subreddit"] = subreddit

    try:
        resp = requests.get(
            "https://api.pullpush.io/reddit/search/submission/",
            params=params,
            headers=REDDIT_HEADERS,
            timeout=15,
        )
        if resp.status_code != 200:
            print(f"    PullPush API error: {resp.status_code}")
            return []

        data = resp.json()
        posts = data.get("data", [])
        results = []

        for p in posts:
            title = p.get("title", "").strip()
            permalink = p.get("permalink", "")
            selftext = p.get("selftext", "").strip()
            subreddit_name = p.get("subreddit", "")
            score = p.get("score", 0)
            num_comments = p.get("num_comments", 0)
            removed = p.get("removed_by_category")
            author = p.get("author", "")

            # Skip removed/deleted posts
            if removed:
                continue
            if author in ("[deleted]", "[removed]"):
                continue
            if selftext in ("[removed]", "[deleted]"):
                selftext = ""
            if not title or not permalink:
                continue
            # Skip very low engagement posts
            if score < 1 and num_comments < 1:
                continue

            url = f"https://www.reddit.com{permalink}"
            description = selftext[:200] if selftext else f"Discussion in r/{subreddit_name} with {num_comments} comments."

            results.append({
                "title": title,
                "url": url,
                "description": description,
                "answer_count": num_comments,
            })

        return results

    except Exception as e:
        print(f"    Reddit search error for '{query}': {e}")
        return []


# ============================================================
# Zhihu/Quora: Gemini Google Search (with grounding validation)
# ============================================================
def search_questions_gemini(platform: str, query: str) -> list[dict]:
    """Use Gemini googleSearch to find questions on Zhihu/Quora.
    Extracts real URLs from grounding metadata, then uses AI to summarize."""
    sites = {
        "zhihu": "zhihu.com",
        "quora": "quora.com",
    }
    site = sites.get(platform, "google.com")
    lang_instruction = "用中文回答" if platform == "zhihu" else "Answer in English"

    prompt = f"""Use Google Search to find REAL, ACTIVE questions on {site} regarding "{query}".
We are strictly looking for questions about hat customization, embroidery, caps, or headwear design.

CRITICAL INSTRUCTIONS:
1. ONLY use actual URLs and titles found in the Google Search results.
2. DO NOT mix up titles from one result with URLs from another. Keep the 1:1 mapping strict.
3. DISCARD any results that are not relevant to hats.
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

        # Extract guaranteed real URLs from grounding metadata
        grounding_urls = {}  # url -> title
        if response.candidates and response.candidates[0].grounding_metadata:
            gm = response.candidates[0].grounding_metadata
            if getattr(gm, 'grounding_chunks', None):
                for chunk in gm.grounding_chunks:
                    if getattr(chunk, 'web', None) and getattr(chunk.web, 'uri', None):
                        uri = chunk.web.uri
                        title = getattr(chunk.web, 'title', '') or ''
                        if site in uri:
                            grounding_urls[uri] = title

        # Parse AI-generated JSON
        resp_text = response.text or ""
        questions = parse_json_response(resp_text)

        # Cross-validate: only keep URLs that exist in grounding data
        final_qs = []
        for q in questions:
            url = q.get("url", "").strip()
            if not url:
                continue

            # Check if this URL (or a close variant) exists in grounding
            is_grounded = any(
                url.rstrip("/") in g_url.rstrip("/") or g_url.rstrip("/") in url.rstrip("/")
                for g_url in grounding_urls
            )
            if not is_grounded and len(grounding_urls) > 0:
                print(f"      Dropping hallucinated URL -> {url}")
                continue

            final_qs.append(q)

        return final_qs

    except Exception as e:
        print(f"    Search error for '{query}': {e}")
        return []


def parse_json_response(text: str) -> list[dict]:
    """Parse JSON array from potentially messy AI response."""
    clean = re.sub(r'```json\s*|```\s*', '', text).strip()
    start = clean.find('[')
    end = clean.rfind(']')
    if start == -1 or end == -1:
        return []

    try:
        return json.loads(clean[start:end + 1])
    except json.JSONDecodeError:
        json_str = clean[start:end + 1]
        json_str = re.sub(r',\s*]', ']', json_str)
        json_str = re.sub(r',\s*}', '}', json_str)
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            return []


# ============================================================
# Relevance Scoring
# ============================================================
def compute_relevance(question_text: str, conn: sqlite3.Connection) -> tuple[float, list[str]]:
    """Score how relevant a question is to our knowledge base using embedding similarity."""
    try:
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=question_text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
        )
        q_embedding = result.embeddings[0].values

        rows = conn.execute("SELECT id, content, tags, embedding FROM chunks WHERE embedding IS NOT NULL").fetchall()

        scores = []
        for row in rows:
            chunk_embedding = struct.unpack(f'{EMBEDDING_DIM}f', row[3])
            dot = sum(a * b for a, b in zip(q_embedding, chunk_embedding))
            norm_q = sum(a * a for a in q_embedding) ** 0.5
            norm_c = sum(a * a for a in chunk_embedding) ** 0.5
            if norm_q > 0 and norm_c > 0:
                sim = dot / (norm_q * norm_c)
            else:
                sim = 0
            scores.append((sim, row[1], row[2]))

        scores.sort(key=lambda x: x[0], reverse=True)

        top_scores = [s[0] for s in scores[:3]]
        relevance = sum(top_scores) / len(top_scores) if top_scores else 0

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
# Content Relevance Filter
# ============================================================
RELEVANT_KEYWORDS = [
    "hat", "cap", "beanie", "embroidery", "custom", "logo", "patch", "stitch",
    "snapback", "headwear", "trucker", "brim", "visor", "needlework", "apparel", "merch",
    "帽", "刺绣", "定制", "设计", "礼品", "企业", "加工", "定做", "绣花", "印花"
]


def is_content_relevant(title: str, desc: str) -> bool:
    """Check if content is about hats/customization."""
    content_text = (title + " " + desc).lower()
    return any(kw in content_text for kw in RELEVANT_KEYWORDS)


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

    total_new = 0
    total_skipped = 0

    # --- Reddit: Use PullPush API (guaranteed real data) ---
    if platform in ("reddit", "all"):
        print(f"\n{'=' * 50}")
        print(f"  Collecting from: REDDIT (via PullPush API)")
        print(f"{'=' * 50}")

        seen_urls = set()

        # Phase 1: Search by keywords
        for query in REDDIT_SEARCHES:
            print(f"\n  Searching: '{query}'...")
            questions = search_reddit_questions(query)
            print(f"    Found {len(questions)} posts")

            for q in questions:
                title = q["title"]
                url = q["url"].rstrip("/")
                desc = q["description"]
                answer_count = q["answer_count"]

                if url in seen_urls:
                    continue
                seen_urls.add(url)

                if not is_content_relevant(title, desc):
                    print(f"      Skipped (irrelevant): '{title[:40]}...'")
                    total_skipped += 1
                    continue

                existing = conn.execute("SELECT id FROM questions WHERE url = ?", (url,)).fetchone()
                if existing:
                    total_skipped += 1
                    continue

                relevance, matched_tags = compute_relevance(f"{title} {desc}", conn)
                print(f"    → '{title[:50]}...' relevance={relevance:.3f}")

                if relevance < 0.3:
                    print(f"      Skipped (low relevance)")
                    total_skipped += 1
                    continue

                conn.execute(
                    """INSERT INTO questions
                       (platform, url, title, description, answer_count, relevance_score, matched_tags, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, 'new')""",
                    ("reddit", url, title, desc, answer_count, relevance, json.dumps(matched_tags)),
                )
                total_new += 1

            conn.commit()
            time.sleep(1)  # Rate limiting

        # Phase 2: Search by subreddit
        for sub in REDDIT_SUBREDDITS:
            print(f"\n  Searching subreddit: r/{sub}...")
            questions = search_reddit_questions("custom hat", subreddit=sub)
            print(f"    Found {len(questions)} posts")

            for q in questions:
                title = q["title"]
                url = q["url"].rstrip("/")
                desc = q["description"]
                answer_count = q["answer_count"]

                if url in seen_urls:
                    continue
                seen_urls.add(url)

                if not is_content_relevant(title, desc):
                    print(f"      Skipped (irrelevant): '{title[:40]}...'")
                    total_skipped += 1
                    continue

                existing = conn.execute("SELECT id FROM questions WHERE url = ?", (url,)).fetchone()
                if existing:
                    total_skipped += 1
                    continue

                relevance, matched_tags = compute_relevance(f"{title} {desc}", conn)
                print(f"    → '{title[:50]}...' relevance={relevance:.3f}")

                if relevance < 0.3:
                    print(f"      Skipped (low relevance)")
                    total_skipped += 1
                    continue

                conn.execute(
                    """INSERT INTO questions
                       (platform, url, title, description, answer_count, relevance_score, matched_tags, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, 'new')""",
                    ("reddit", url, title, desc, answer_count, relevance, json.dumps(matched_tags)),
                )
                total_new += 1

            conn.commit()
            time.sleep(1)

    # --- Zhihu: Use Gemini Search ---
    if platform in ("zhihu", "all"):
        print(f"\n{'=' * 50}")
        print(f"  Collecting from: ZHIHU")
        print(f"{'=' * 50}")

        for query in ZHIHU_SEARCHES:
            print(f"\n  Searching: '{query}'...")
            questions = search_questions_gemini("zhihu", query)
            print(f"    Found {len(questions)} questions")

            for q in questions:
                title = q.get("title", "").strip()
                url = q.get("url", "").strip()
                desc = q.get("description", "").strip()
                answer_count = q.get("answer_count", 0)

                if not title or not url:
                    continue

                if not is_content_relevant(title, desc):
                    print(f"      Skipped (irrelevant): '{title[:30]}...'")
                    total_skipped += 1
                    continue

                existing = conn.execute("SELECT id FROM questions WHERE url = ?", (url,)).fetchone()
                if existing:
                    total_skipped += 1
                    continue

                relevance, matched_tags = compute_relevance(f"{title} {desc}", conn)
                print(f"    → '{title[:50]}...' relevance={relevance:.3f}")

                if relevance < 0.3:
                    print(f"      Skipped (low relevance)")
                    total_skipped += 1
                    continue

                conn.execute(
                    """INSERT INTO questions
                       (platform, url, title, description, answer_count, relevance_score, matched_tags, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, 'new')""",
                    ("zhihu", url, title, desc, answer_count, relevance, json.dumps(matched_tags)),
                )
                total_new += 1

            conn.commit()
            time.sleep(2)

    # --- Quora: Use Gemini Search ---
    if platform in ("quora", "all"):
        print(f"\n{'=' * 50}")
        print(f"  Collecting from: QUORA")
        print(f"{'=' * 50}")

        for query in QUORA_SEARCHES:
            print(f"\n  Searching: '{query}'...")
            questions = search_questions_gemini("quora", query)
            print(f"    Found {len(questions)} questions")

            for q in questions:
                title = q.get("title", "").strip()
                url = q.get("url", "").strip()
                desc = q.get("description", "").strip()
                answer_count = q.get("answer_count", 0)

                if not title or not url:
                    continue

                if not is_content_relevant(title, desc):
                    print(f"      Skipped (irrelevant): '{title[:30]}...'")
                    total_skipped += 1
                    continue

                existing = conn.execute("SELECT id FROM questions WHERE url = ?", (url,)).fetchone()
                if existing:
                    total_skipped += 1
                    continue

                relevance, matched_tags = compute_relevance(f"{title} {desc}", conn)
                print(f"    → '{title[:50]}...' relevance={relevance:.3f}")

                if relevance < 0.3:
                    print(f"      Skipped (low relevance)")
                    total_skipped += 1
                    continue

                conn.execute(
                    """INSERT INTO questions
                       (platform, url, title, description, answer_count, relevance_score, matched_tags, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, 'new')""",
                    ("quora", url, title, desc, answer_count, relevance, json.dumps(matched_tags)),
                )
                total_new += 1

            conn.commit()
            time.sleep(2)

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
