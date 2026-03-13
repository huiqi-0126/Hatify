import sqlite3
conn = sqlite3.connect('knowledge.db')
print("--- Question Counts ---")
for row in conn.execute("SELECT platform, COUNT(*) FROM questions GROUP BY platform"):
    print(f"{row[0]}: {row[1]}")

print("\n--- Recent Reddit Items ---")
for row in conn.execute("SELECT id, title, url FROM questions WHERE platform='reddit' ORDER BY id DESC LIMIT 5"):
    print(f"ID: {row[0]} | Title: {row[1]} | URL: {row[2]}")
conn.close()
