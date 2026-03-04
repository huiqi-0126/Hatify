import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";

const db = new Database("inquiries.db");

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    design_text TEXT NOT NULL,
    hat_style TEXT NOT NULL,
    contact TEXT NOT NULL,
    story TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration: Ensure selections column exists
try {
  db.exec("ALTER TABLE inquiries ADD COLUMN selections TEXT");
} catch (e) {
  // Column likely already exists
}



async function startServer() {
  const app = express();
  const PORT = 3001;

  app.use(express.json());

  // API routes
  app.post("/api/inquiries", (req, res) => {
    const { design_text, hat_style, contact, story, selections } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO inquiries (design_text, hat_style, contact, story, selections) VALUES (?, ?, ?, ?, ?)");
      const info = stmt.run(design_text, hat_style, contact, story, JSON.stringify(selections));
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save inquiry" });
    }
  });

  app.get("/api/inquiries", (req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM inquiries ORDER BY created_at DESC");
      const inquiries = stmt.all().map((row: any) => ({
        ...row,
        selections: row.selections ? JSON.parse(row.selections) : null
      }));
      res.json(inquiries);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch inquiries" });
    }
  });


  // Proxy route for dreambrand images to bypass CORS
  app.post("/api/dreambrand/images", async (req, res) => {
    try {
      const response = await fetch('https://ai.dreambrand.studio/api/global/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: "Failed to fetch images from external API" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
