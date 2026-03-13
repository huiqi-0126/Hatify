import sqlite3
conn = sqlite3.connect('knowledge.db')
cursor = conn.execute("SELECT * FROM questions WHERE url LIKE '%67987421%'")
row = cursor.fetchone()
if row:
    print(f"Found: {row}")
else:
    print("Not found in DB")
conn.close()
