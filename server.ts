import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { exec } from "child_process";
import fs from "fs";
import dotenv from "dotenv";

const envPath = (process.env.NODE_ENV !== "production" && fs.existsSync("env_dev")) ? "env_dev" : ".env";
dotenv.config({ path: envPath });



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



// Helper to inject SEO meta tags into HTML
async function injectSEOMeta(html: string, postId: string) {
  try {
    const blogDataRaw = fs.readFileSync(path.resolve(__dirname, "src/data/blog.json"), "utf-8");
    const blogData = JSON.parse(blogDataRaw);
    const post = blogData.find((p: any) => String(p.id) === postId);

    if (post) {
      const title = `${post.title} | Hatify`;
      const description = post.description.replace(/"/g, '&quot;');
      const url = `https://customhat.top/blog/${postId}`;
      const image = post.image.startsWith('http') ? post.image : `https://customhat.top/${post.image}`;

      // 1. Replace Title
      html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);

      // 2. Replace/Inject Meta Description
      const descTag = `<meta name="description" content="${description}" />`;
      if (html.match(/<meta\s+name="description"[\s\S]*?>/i)) {
        html = html.replace(/<meta\s+name="description"[\s\S]*?>/i, descTag);
      } else {
        html = html.replace("</head>", `${descTag}\n</head>`);
      }

      // 3. Replace/Inject Open Graph tags
      const ogTags = [
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: url },
        { property: 'og:image', content: image },
        { property: 'og:type', content: 'article' }
      ];

      ogTags.forEach(tag => {
        const regex = new RegExp(`<meta\\s+property="${tag.property}"[\\s\\S]*?>`, 'i');
        const newTag = `<meta property="${tag.property}" content="${tag.content}" />`;
        if (html.match(regex)) {
          html = html.replace(regex, newTag);
        } else {
          html = html.replace("</head>", `${newTag}\n</head>`);
        }
      });

      // 4. Replace/Inject Twitter tags
      const twitterTags = [
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: image }
      ];

      twitterTags.forEach(tag => {
        const regex = new RegExp(`<meta\\s+name="${tag.name}"[\\s\\S]*?>`, 'i');
        const newTag = `<meta name="${tag.name}" content="${tag.content}" />`;
        if (html.match(regex)) {
          html = html.replace(regex, newTag);
        } else {
          html = html.replace("</head>", `${newTag}\n</head>`);
        }
      });

      // 5. Inject/Update H1 for SEO tools that check body content
      // Keep it hidden to avoid flashing during hydration
      const h1Match = html.match(/<h1[\s\S]*?>([\s\S]*?)<\/h1>/i);
      if (h1Match) {
         html = html.replace(/<h1[\s\S]*?>[\s\S]*?<\/h1>/i, `<h1 style="position: absolute; left: -9999px;">${post.title}</h1>`);
      }
    }
  } catch (error) {
    console.error("SEO Injection failed:", error);
  }
  return html;
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

  // Handle blog pages specifically for SEO injection (Dev + Prod)
  app.get("/blog/:id", async (req, res, next) => {
    const postId = req.params.id;
    
    if (process.env.NODE_ENV !== "production") {
      try {
        // Dev mode: use vite to transform index.html
        const vite = (app as any).viteInstance;
        if (!vite) return next();
        
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        const html = await injectSEOMeta(template, postId);
        return res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        next(e);
      }
    } else {
      // Production mode: use built index.html
      const indexPath = path.resolve(__dirname, "dist", "index.html");
      try {
        const template = fs.readFileSync(indexPath, "utf-8");
        const html = await injectSEOMeta(template, postId);
        return res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        res.sendFile(indexPath);
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    (app as any).viteInstance = vite; // Store instance for route access
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
