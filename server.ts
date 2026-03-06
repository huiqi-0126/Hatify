import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { exec } from "child_process";

const db = new Database("inquiries.db");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const PORT = Number(process.env.PORT) || 3001;

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
    console.log(`[Proxy] Incoming request for /api/dreambrand/images`);
    try {
      const response = await fetch('https://ai.dreambrand.studio/api/global/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
          'Origin': 'https://ai.dreambrand.studio',
          'Referer': 'https://ai.dreambrand.studio/'
        },
        body: JSON.stringify(req.body)
      });

      if (!response.ok) {
        console.error(`[Proxy] Remote server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('[Proxy] Error:', error);
      res.status(500).json({ error: "Failed to fetch images from external API" });
    }
  });

  // Blog scanning endpoint
  app.post("/api/blog/scan", (req, res) => {
    console.log("[Blog] Starting manual scan...");
    exec("python scripts/scan_blog.py && python scripts/score_blogs.py", (error, stdout, stderr) => {
      if (error) {
        console.error(`[Blog] Scan error: ${error}`);
        return res.status(500).json({ success: false, error: error.message });
      }
      console.log(`[Blog] Scan output: ${stdout}`);
      if (stderr) console.error(`[Blog] Scan stderr: ${stderr}`);
      res.json({ success: true, message: stdout });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));

    // Handle SPA routing: serve index.html for all non-API routes
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
