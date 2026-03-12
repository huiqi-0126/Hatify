import os
import json
import re
from datetime import datetime
from pathlib import Path
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Set up Gemini
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

DATA_FILE = Path("src/data/blog.json")

def score_article(title, description, content):
    # 1. Content Length Score (0-30 points)
    text_content = re.sub('<[^<]+?>', '', content)
    word_count = len(text_content.split())
    
    length_score = 0
    if word_count > 500:
        length_score = 30
    elif word_count > 200:
        length_score = 20
    elif word_count > 100:
        length_score = 10
    else:
        length_score = 0

    # 2. Hard Penalty Check (Promotional Content & Competitors)
    # Check for phone numbers, "Call or text", and specific competitor names
    marketing_patterns = [
        r'\d{3}-\d{3}-\d{4}', # 800-810-4692
        r'call or text',
        r'place an order today',
        r'broken arrow',
        r'logo sportswear',
        r'custom ink',
        r'blue cotton',
        r'merchology'
    ]
    
    penalty_reason = []
    content_lower = (title + description + text_content).lower()
    
    for pattern in marketing_patterns:
        if re.search(pattern, content_lower):
            penalty_reason.append(f"Matched marketing pattern: {pattern}")

    # 3. Relevance Score (0-70 points) using Gemini
    print(f"  Scoring relevance for: {title[:50]}...")
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config={
            "temperature": 0.1,
            "response_mime_type": "application/json",
        }
    )
    
    current_default_date = datetime.now().strftime("%Y-%m-%d")
    
    prompt = f"""
    You are a strict content auditor and SEO copywriter for "Hatify" (Custom Hats & Embroidery).
    
    Current Article Title: {title}
    Article Content: {text_content[:800]}
    
    TASK:
    1. Score relevance (0-70) to HATS and EMBROIDERY.
    2. Extract or generate 2-4 tags.
    3. Extract a publication date if mentioned, otherwise return "{current_default_date}".
    4. Generate a "catchy_title": A more attractive, click-worthy, and SEO-optimized version of the original title. It should be similar in meaning but much more engaging for a blog reader.
    
    Return JSON:
    {{
       "relevance_score": (int),
       "reasoning": "Explain score briefly",
       "tags": ["Tag1", "Tag2"],
       "date": "YYYY-MM-DD",
       "catchy_title": "The new optimized title"
    }}
    """
    
    relevance_score = 0
    reasoning = ""
    scoring_type = "model"
    tags = ["Blog"]
    date = current_default_date
    catchy_title = title
    
    try:
        response = model.generate_content(prompt)
        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            raw_text = re.sub(r'^```json\s*|\s*```$', '', raw_text, flags=re.MULTILINE)
        
        result = json.loads(raw_text)
        relevance_score = result.get('relevance_score', 0)
        reasoning = result.get('reasoning', "")
        tags = result.get('tags', ["Blog"])
        catchy_title = result.get('catchy_title', title)
        
        # Date cleanup: if AI returns empty or invalid, use default
        extracted_date = result.get('date', "")
        if not extracted_date or extracted_date == "N/A" or "1970" in extracted_date:
            date = current_default_date
        else:
            date = extracted_date
            
    except Exception as e:
        print(f"    AI failed: {e}")
        scoring_type = "fallback"
        relevance_score = 40 if 'hat' in content_lower or 'embroidery' in content_lower else 10
        reasoning = "Fallback scoring based on keywords."
        tags = ["Update"]
        date = current_default_date
        catchy_title = title

    # 4. Apply Local Rule Penalty (-20 points)
    if penalty_reason:
        relevance_score = max(0, relevance_score - 20)
        reasoning = f"Penalty (-20 pts) for patterns: {'; '.join(penalty_reason)}. " + reasoning

    total_score = length_score + relevance_score
    return total_score, reasoning, scoring_type, tags, date, catchy_title

def process_scoring():
    if not DATA_FILE.exists():
        print("blog.json not found.")
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        articles = json.load(f)

    now = datetime.now()
    # Normalize today's date formats for comparison
    today_v1 = now.strftime("%Y-%m-%d")
    today_v2 = f"{now.year}-{now.month}-{now.day}"

    updated_articles = []
    print(f"Incremental Scoring (Threshold: 80):")
    
    for art in articles:
        # Rule: Only call AI if 'score' is missing OR if we haven't generated a catchy title yet ('original_title' is missing).
        if "score" in art and "original_title" in art:
            print(f"  Skipping AI for: {art.get('title', '')[:40]}... (Using existing score: {art['score']})")
            art["show"] = art["score"] > 80
            updated_articles.append(art)
            continue

        # Score new or refreshed articles
        print(f"  Scoring New/Refreshed: {art.get('title', '')[:40]}...")
        score, reasoning, s_type, tags, date, catchy_title = score_article(art.get("title", ""), art.get("description", ""), art.get("content", ""))
        
        # Preserve original title if not already preserved
        if "original_title" not in art:
            art["original_title"] = art.get("title", "")
            
        art["score"] = score
        art["reasoning"] = reasoning
        art["scoring_type"] = s_type
        art["tags"] = tags
        art["date"] = date
        art["title"] = catchy_title # Replace with catchy title for display
        art["show"] = score > 80
        print(f"    Result: {score} ({s_type}) -> Show: {art['show']}")
        print(f"    New Title: {catchy_title}")
        updated_articles.append(art)
             
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(updated_articles, f, indent=2, ensure_ascii=False)
    
    print("Scoring and metadata update complete.")

if __name__ == "__main__":
    process_scoring()
