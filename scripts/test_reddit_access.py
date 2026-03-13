import requests
from bs4 import BeautifulSoup

def test_reddit():
    url = "https://www.reddit.com/r/embroidery/comments/11yq96a/help_solving_this_question/" # This was a math link but lets test any reddit link
    # Try a known hat related one if possible or just any
    test_url = "https://www.reddit.com/r/embroidery/comments/11yzh5l/hat_embroidery_help/" 
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    }
    
    try:
        print(f"Testing access to: {test_url}")
        resp = requests.get(test_url, headers=headers, timeout=10)
        print(f"Status Code: {resp.status_code}")
        # print(f"Preview: {resp.text[:500]}")
        
        soup = BeautifulSoup(resp.text, "html.parser")
        text = soup.get_text().lower()
        print(f"Text length: {len(text)}")
        
        removed_markers = [
            "sorry, this post was removed",
            "sorry, this post has been removed",
            "post was removed by reddit's filters",
        ]
        for marker in removed_markers:
            if marker in text:
                print(f"MATCHED REMOVED MARKER: {marker}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_reddit()
