"""
Test to understand grounding_metadata structure from Gemini Google Search.
Goal: Extract real URLs and titles directly from grounding chunks.
"""
from google import genai
from google.genai import types
import os, json
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

response = client.models.generate_content(
    model="gemini-2.5-flash-lite",
    contents='Find questions about custom hat embroidery on reddit.com site:reddit.com',
    config=types.GenerateContentConfig(
        tools=[types.Tool(google_search=types.GoogleSearch())]
    )
)

print("=== AI Text (may have hallucinations) ===")
print(response.text[:500])

print("\n=== Grounding Metadata ===")
gm = response.candidates[0].grounding_metadata
if gm:
    # Check grounding_chunks
    chunks = getattr(gm, 'grounding_chunks', None)
    if chunks:
        print(f"\nGrounding Chunks ({len(chunks)}):")
        for i, chunk in enumerate(chunks):
            web = getattr(chunk, 'web', None)
            if web:
                print(f"  [{i}] Title: {getattr(web, 'title', 'N/A')}")
                print(f"      URI:   {getattr(web, 'uri', 'N/A')}")
    else:
        print("No grounding_chunks found")
    
    # Check search_entry_point
    sep = getattr(gm, 'search_entry_point', None)
    if sep:
        print(f"\nSearch Entry Point: {str(sep)[:200]}")
    
    # Check web_search_queries
    wsq = getattr(gm, 'web_search_queries', None)
    if wsq:
        print(f"\nWeb Search Queries: {wsq}")
    
    # Check grounding_supports for URL-text mappings
    supports = getattr(gm, 'grounding_supports', None)
    if supports:
        print(f"\nGrounding Supports ({len(supports)}):")
        for i, s in enumerate(supports):
            print(f"  [{i}] Text: {getattr(s, 'segment', {})}")
            indices = getattr(s, 'grounding_chunk_indices', [])
            print(f"      Chunk indices: {indices}")
    else:
        print("\nNo grounding_supports found")
else:
    print("No grounding metadata at all!")
