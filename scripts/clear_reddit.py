import sqlite3
conn = sqlite3.connect('knowledge.db')
conn.execute("DELETE FROM answers WHERE question_id IN (SELECT id FROM questions WHERE platform='reddit')")
conn.execute("DELETE FROM questions WHERE platform='reddit'")
conn.commit()
print("Cleared all Reddit data for fresh start")
conn.close()
