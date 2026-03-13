"""Test alternative approaches to get Reddit post data"""
import requests

# Approach 4: via Google Cache / webcache
print("=== Approach 4: Reddit via api.pullpush.io (Pushshift successor) ===")
url = "https://api.pullpush.io/reddit/search/submission/?q=custom+hat+embroidery&size=5&sort=desc&sort_type=score"
try:
    resp = requests.get(url, timeout=10)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        posts = data.get("data", [])
        for p in posts[:3]:
            print(f"\nTitle: {p.get('title')}")
            print(f"Permalink: https://www.reddit.com{p.get('permalink')}")
            print(f"Subreddit: r/{p.get('subreddit')}")
            print(f"Score: {p.get('score')}")
            print(f"Num comments: {p.get('num_comments')}")
            print(f"Selftext: {p.get('selftext', '')[:100]}")
            print(f"Removed: {p.get('removed_by_category')}")
    else:
        print(f"Body: {resp.text[:300]}")
except Exception as e:
    print(f"Error: {e}")

# Approach 5: Google Custom Search API (free tier) 
print("\n=== Approach 5: SerpAPI-style Google search via requests ===")
# Use Google's CSE JSON API (if configured) or just test direct Google
# Actually let's try the simplest reliable approach: 
# Use Gemini grounding to get URLs, then use browser to verify

# Approach 6: Use requests with session and cookies
print("\n=== Approach 6: Reddit with session ===")
session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
})

try:
    # First visit the homepage to get cookies
    home = session.get("https://www.reddit.com/", timeout=10)
    print(f"Home status: {home.status_code}")
    
    # Then try the JSON endpoint
    post_url = "https://www.reddit.com/r/hats/comments/v4lq0m/best_place_to_get_a_singular_custom_hat_made.json"
    resp = session.get(post_url, timeout=10)
    print(f"Post JSON status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        post = data[0]["data"]["children"][0]["data"]
        print(f"Title: {post.get('title')}")
except Exception as e:
    print(f"Error: {e}")
