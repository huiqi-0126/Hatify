"""
generate_answers.py

Generates AI-powered answers for collected questions using the knowledge base.
Retrieves relevant chunks via embedding similarity, then uses Gemini Pro to compose answers.

Usage: python scripts/generate_answers.py [--limit N] [--question-id ID]
"""

import json
import os
import re
import sqlite3
import struct
import sys
import time
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
# Knowledge Retrieval
# ============================================================
def retrieve_relevant_chunks(question_text: str, conn: sqlite3.Connection, top_k: int = 5) -> list[dict]:
    """Retrieve the most relevant knowledge chunks for a question."""
    try:
        result = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=question_text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY"),
        )
        q_embedding = result.embeddings[0].values
    except Exception as e:
        print(f"  Embedding error: {e}")
        return []

    rows = conn.execute(
        "SELECT id, source, article_id, section, content, tags, embedding FROM chunks WHERE embedding IS NOT NULL"
    ).fetchall()

    scored = []
    for row in rows:
        chunk_embedding = struct.unpack(f'{EMBEDDING_DIM}f', row[6])
        dot = sum(a * b for a, b in zip(q_embedding, chunk_embedding))
        norm_q = sum(a * a for a in q_embedding) ** 0.5
        norm_c = sum(a * a for a in chunk_embedding) ** 0.5
        sim = dot / (norm_q * norm_c) if norm_q > 0 and norm_c > 0 else 0
        scored.append({
            "id": row[0],
            "source": row[1],
            "article_id": row[2],
            "section": row[3],
            "content": row[4],
            "tags": row[5],
            "similarity": sim,
        })

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:top_k]


# ============================================================
# Answer Generation
# ============================================================
def generate_answer(question: dict, chunks: list[dict], platform: str) -> dict:
    """Generate an answer using Gemini based on retrieved knowledge."""

    # Build context from chunks
    context_parts = []
    source_ids = []
    for i, chunk in enumerate(chunks):
        context_parts.append(f"[Reference {i + 1}] ({chunk['source']} / {chunk['section']})\n{chunk['content']}")
        source_ids.append(chunk["article_id"])

    context = "\n\n---\n\n".join(context_parts)

    if platform == "zhihu":
        prompt = f"""你是 Hatify 的帽子定制专家，一位在帽子制造和刺绣领域有丰富经验的专业人士。
请基于以下参考资料回答用户在知乎上的问题。

要求：
1. 专业但亲和，像行业内的朋友在分享经验
2. 包含具体数据和建议（如尺寸、材料、工艺、价格范围）
3. 自然地体现帽子定制的专业知识，但不要硬推销
4. 中文回答，控制在 300-600 字
5. 分段清晰，可以用数字列表或重点标记
6. 末尾可附 1 条相关知识延伸或建议
7. 语气要符合知乎社区风格，专业中带有个人见解

参考资料：
{context}

用户问题：{question['title']}
{question.get('description', '')}

请直接回答问题，不要包含任何前缀如"以下是回答"之类的。"""
    else:
        # Quora / English
        prompt = f"""You are a custom hat and embroidery expert from Hatify, with extensive experience in hat manufacturing, embroidery techniques, and custom headwear design.
Answer the following question based on the provided reference materials.

Requirements:
1. Be professional yet friendly, like an industry colleague sharing expertise
2. Include specific data and recommendations (sizes, materials, techniques, price ranges)
3. Naturally demonstrate hat customization expertise without hard selling
4. Keep the answer between 200-400 words
5. Use clear paragraphs or numbered points
6. End with a relevant pro tip or related insight
7. Match the tone of Quora - authoritative yet personal

Reference Materials:
{context}

Question: {question['title']}
{question.get('description', '')}

Answer the question directly without any preamble like "Here's the answer" etc."""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )
        answer_text = response.text or ""

        return {
            "content": answer_text.strip(),
            "sources": json.dumps(list(set(source_ids))),
            "language": "zh" if platform == "zhihu" else "en",
        }
    except Exception as e:
        print(f"  Generation error: {e}")
        return {"content": "", "sources": "[]", "language": "zh" if platform == "zhihu" else "en"}


# ============================================================
# Main
# ============================================================
def main(limit: int = 10, question_id: int | None = None):
    conn = sqlite3.connect(str(DB_PATH))

    # Get questions to answer
    if question_id:
        questions = conn.execute(
            "SELECT id, platform, url, title, description, relevance_score FROM questions WHERE id = ?",
            (question_id,),
        ).fetchall()
    else:
        # Get new questions without answers, sorted by relevance
        questions = conn.execute(
            """SELECT q.id, q.platform, q.url, q.title, q.description, q.relevance_score
               FROM questions q
               LEFT JOIN answers a ON a.question_id = q.id
               WHERE q.status = 'new' AND a.id IS NULL
               ORDER BY q.relevance_score DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()

    if not questions:
        print("No questions to answer.")
        conn.close()
        return

    print(f"Generating answers for {len(questions)} questions...\n")

    for row in questions:
        q = {
            "id": row[0],
            "platform": row[1],
            "url": row[2],
            "title": row[3],
            "description": row[4] or "",
            "relevance": row[5],
        }

        print(f"[{q['platform'].upper()}] {q['title'][:60]}...")
        print(f"  Relevance: {q['relevance']:.3f} | URL: {q['url'][:60]}...")

        # Retrieve relevant knowledge
        search_text = f"{q['title']} {q['description']}"
        chunks = retrieve_relevant_chunks(search_text, conn, top_k=5)
        print(f"  Retrieved {len(chunks)} relevant chunks (top similarity: {chunks[0]['similarity']:.3f})")

        # Generate answer
        answer = generate_answer(q, chunks, q["platform"])

        if answer["content"]:
            # Save answer
            conn.execute(
                "INSERT INTO answers (question_id, content, sources, language, status) VALUES (?, ?, ?, ?, 'draft')",
                (q["id"], answer["content"], answer["sources"], answer["language"]),
            )
            # Update question status
            conn.execute("UPDATE questions SET status = 'drafting' WHERE id = ?", (q["id"],))
            conn.commit()
            print(f"  ✅ Answer generated ({len(answer['content'])} chars)")
        else:
            print(f"  ❌ Failed to generate answer")

        print()
        time.sleep(2)  # Rate limiting

    conn.close()
    print("Done!")


if __name__ == "__main__":
    limit = 10
    question_id = None

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--limit" and i + 1 < len(args):
            limit = int(args[i + 1])
            i += 2
        elif args[i] == "--question-id" and i + 1 < len(args):
            question_id = int(args[i + 1])
            i += 2
        else:
            i += 1

    main(limit=limit, question_id=question_id)
