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

  // ============================================================
  // Q&A Agent APIs
  // ============================================================
  const qaDb = new Database("knowledge.db");

  // Initialize tables if they don't exist yet
  qaDb.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      url TEXT UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      asked_at TEXT,
      answer_count INTEGER DEFAULT 0,
      relevance_score REAL DEFAULT 0,
      matched_tags TEXT,
      status TEXT DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER REFERENCES questions(id),
      content TEXT NOT NULL,
      content_en TEXT,
      sources TEXT,
      language TEXT DEFAULT 'zh',
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // GET /api/qa/questions — List questions with optional filters
  app.get("/api/qa/questions", (req, res) => {
    try {
      const { status, platform, limit = "50", offset = "0" } = req.query;
      let sql = "SELECT * FROM questions";
      const conditions: string[] = [];
      const params: any[] = [];

      if (status && status !== "all") {
        conditions.push("status = ?");
        params.push(status);
      }
      if (platform && platform !== "all") {
        conditions.push("platform = ?");
        params.push(platform);
      }
      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }
      sql += " ORDER BY relevance_score DESC, created_at DESC";
      sql += ` LIMIT ? OFFSET ?`;
      params.push(Number(limit), Number(offset));

      const questions = qaDb.prepare(sql).all(...params);

      // Get total count
      let countSql = "SELECT COUNT(*) as total FROM questions";
      if (conditions.length > 0) {
        countSql += " WHERE " + conditions.join(" AND ");
      }
      const total = qaDb.prepare(countSql).get(...params.slice(0, -2)) as any;

      res.json({
        questions: questions.map((q: any) => ({
          ...q,
          matched_tags: q.matched_tags ? JSON.parse(q.matched_tags) : [],
        })),
        total: total?.total || 0,
      });
    } catch (error) {
      console.error("[QA] Questions error:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // PATCH /api/qa/questions/:id — Update question status
  app.patch("/api/qa/questions/:id", (req, res) => {
    try {
      const { status } = req.body;
      qaDb.prepare("UPDATE questions SET status = ? WHERE id = ?").run(status, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("[QA] Update question error:", error);
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  // DELETE /api/qa/questions/:id — Delete question and its answers
  app.delete("/api/qa/questions/:id", (req, res) => {
    try {
      qaDb.prepare("DELETE FROM answers WHERE question_id = ?").run(req.params.id);
      qaDb.prepare("DELETE FROM questions WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("[QA] Delete question error:", error);
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  // GET /api/qa/answers — List answers with optional filters
  app.get("/api/qa/answers", (req, res) => {
    try {
      const { question_id, status } = req.query;
      let sql = `SELECT a.*, q.title as question_title, q.platform, q.url as question_url
                 FROM answers a JOIN questions q ON a.question_id = q.id`;
      const conditions: string[] = [];
      const params: any[] = [];

      if (question_id) {
        conditions.push("a.question_id = ?");
        params.push(Number(question_id));
      }
      if (status && status !== "all") {
        conditions.push("a.status = ?");
        params.push(status);
      }
      if (conditions.length > 0) {
        sql += " WHERE " + conditions.join(" AND ");
      }
      sql += " ORDER BY a.created_at DESC";

      const answers = qaDb.prepare(sql).all(...params);
      res.json({
        answers: answers.map((a: any) => ({
          ...a,
          sources: a.sources ? JSON.parse(a.sources) : [],
        })),
      });
    } catch (error) {
      console.error("[QA] Answers error:", error);
      res.status(500).json({ error: "Failed to fetch answers" });
    }
  });

  // PATCH /api/qa/answers/:id — Update answer content/status
  app.patch("/api/qa/answers/:id", (req, res) => {
    try {
      const { content, status } = req.body;
      if (content !== undefined) {
        qaDb.prepare("UPDATE answers SET content = ? WHERE id = ?").run(content, req.params.id);
      }
      if (status !== undefined) {
        qaDb.prepare("UPDATE answers SET status = ? WHERE id = ?").run(status, req.params.id);
        // If marking as answered, update question status too
        if (status === "approved") {
          const answer = qaDb.prepare("SELECT question_id FROM answers WHERE id = ?").get(req.params.id) as any;
          if (answer) {
            qaDb.prepare("UPDATE questions SET status = 'answered' WHERE id = ?").run(answer.question_id);
          }
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error("[QA] Update answer error:", error);
      res.status(500).json({ error: "Failed to update answer" });
    }
  });

  // POST /api/qa/generate — Generate answer for a specific question
  app.post("/api/qa/generate", (req, res) => {
    const { question_id } = req.body;
    console.log(`[QA] Generating answer for question ${question_id}...`);
    exec(`python scripts/generate_answers.py --question-id ${question_id}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`[QA] Generate error: ${error}`);
        return res.status(500).json({ success: false, error: error.message });
      }
      console.log(`[QA] Generate output: ${stdout}`);
      res.json({ success: true, message: stdout });
    });
  });

  // POST /api/qa/collect — Manually trigger question collection
  app.post("/api/qa/collect", (req, res) => {
    const platform = req.body.platform || "all";
    console.log(`[QA] Starting manual collection (${platform})...`);
    exec(`python scripts/collect_questions.py --platform ${platform}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`[QA] Collection error: ${error}`);
        return res.status(500).json({ success: false, error: error.message });
      }
      console.log(`[QA] Collection output: ${stdout}`);
      res.json({ success: true, message: stdout });
    });
  });

  // POST /api/qa/build-kb — Rebuild knowledge base
  app.post("/api/qa/build-kb", (req, res) => {
    console.log("[QA] Rebuilding knowledge base...");
    exec("python scripts/build_knowledge_base.py", (error, stdout, stderr) => {
      if (error) {
        console.error(`[QA] KB build error: ${error}`);
        return res.status(500).json({ success: false, error: error.message });
      }
      console.log(`[QA] KB build output: ${stdout}`);
      res.json({ success: true, message: stdout });
    });
  });

  // GET /api/qa/stats — Dashboard stats
  app.get("/api/qa/stats", (req, res) => {
    try {
      const totalQuestions = (qaDb.prepare("SELECT COUNT(*) as c FROM questions").get() as any)?.c || 0;
      const newQuestions = (qaDb.prepare("SELECT COUNT(*) as c FROM questions WHERE status = 'new'").get() as any)?.c || 0;
      const draftAnswers = (qaDb.prepare("SELECT COUNT(*) as c FROM answers WHERE status = 'draft'").get() as any)?.c || 0;
      const approvedAnswers = (qaDb.prepare("SELECT COUNT(*) as c FROM answers WHERE status = 'approved'").get() as any)?.c || 0;
      const zhihuCount = (qaDb.prepare("SELECT COUNT(*) as c FROM questions WHERE platform = 'zhihu'").get() as any)?.c || 0;
      const quoraCount = (qaDb.prepare("SELECT COUNT(*) as c FROM questions WHERE platform = 'quora'").get() as any)?.c || 0;
      const redditCount = (qaDb.prepare("SELECT COUNT(*) as c FROM questions WHERE platform = 'reddit'").get() as any)?.c || 0;

      let kbChunks = 0;
      try {
        kbChunks = (qaDb.prepare("SELECT COUNT(*) as c FROM chunks").get() as any)?.c || 0;
      } catch { /* chunks table may not exist yet */ }

      res.json({
        totalQuestions,
        newQuestions,
        draftAnswers,
        approvedAnswers,
        zhihuCount,
        quoraCount,
        redditCount,
        kbChunks,
      });
    } catch (error) {
      console.error("[QA] Stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Daily cron job: 23:00 — Collect questions + generate answers
  const scheduleDaily = () => {
    const now = new Date();
    const target = new Date();
    target.setHours(23, 0, 0, 0);
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    const delay = target.getTime() - now.getTime();
    console.log(`[QA Cron] Next run scheduled at ${target.toLocaleString()} (in ${Math.round(delay / 60000)} min)`);

    setTimeout(() => {
      console.log("[QA Cron] Starting daily collection + generation...");
      exec(
        "python scripts/collect_questions.py --platform all && python scripts/generate_answers.py --limit 10",
        (error, stdout, stderr) => {
          if (error) {
            console.error(`[QA Cron] Error: ${error.message}`);
          } else {
            console.log(`[QA Cron] Complete: ${stdout}`);
          }
          // Schedule next run
          scheduleDaily();
        }
      );
    }, delay);
  };
  scheduleDaily();

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
