import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json({ limit: "2mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------
// Static files (HTML/CSS/JS/GLB/etc.)
// ----------------------
app.use(express.static(__dirname));

// Stop favicon 404 noise
app.get("/favicon.ico", (req, res) => res.status(204).end());

// ----------------------
// Home + pages
// ----------------------
app.get("/", (req, res) => {
  const p = path.join(__dirname, "home.html");
  if (fs.existsSync(p)) return res.sendFile(p);
  // If home.html is missing, show a minimal fallback.
  res.type("html").send(`
    <!doctype html><html><head><meta charset="utf-8"><title>Home</title></head>
    <body style="background:#000;color:#fff;font-family:system-ui;padding:24px">
      <h2>Home</h2>
      <p>Missing <b>home.html</b>. Create it in the project folder.</p>
      <ul>
        <li><a style="color:#9cf" href="/text.html">Text mode</a></li>
        <li><a style="color:#9cf" href="/voice.html">Voice + Avatar mode</a></li>
      </ul>
    </body></html>
  `);
});

app.get("/text.html", (req, res) => {
  const p = path.join(__dirname, "text.html");
  if (fs.existsSync(p)) return res.sendFile(p);
  return res.status(404).type("text").send("Missing text.html in project folder.");
});

app.get("/voice.html", (req, res) => {
  const p = path.join(__dirname, "voice.html");
  if (fs.existsSync(p)) return res.sendFile(p);
  return res.status(404).type("text").send("Missing voice.html in project folder.");
});

// ----------------------
// Archive loading + chunking
// ----------------------
const ARCHIVE_DIR = path.join(__dirname, "archive_txt");

function listTxtFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".txt"))
    .map((f) => path.join(dir, f));
}

function chunkText(text, chunkSize = 1400, overlap = 250) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  const chunks = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(clean.length, i + chunkSize);
    chunks.push(clean.slice(i, end));
    if (end === clean.length) break;
    i = Math.max(0, end - overlap);
  }
  return chunks;
}

function tokenize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreOverlap(queryTokens, chunkTokens) {
  const set = new Set(chunkTokens);
  let score = 0;
  for (const t of queryTokens) if (set.has(t)) score += 1;
  return score;
}

let ARCHIVE_CHUNKS = []; // { id, file, text, tokens }

function buildArchiveIndex() {
  const files = listTxtFiles(ARCHIVE_DIR);
  console.log(`Loaded ${files.length} archive files from archive_txt/`);

  const out = [];
  let id = 0;

  for (const filePath of files) {
    const file = path.basename(filePath);
    const raw = fs.readFileSync(filePath, "utf8");
    const chunks = chunkText(raw, 1400, 250);

    for (const c of chunks) {
      out.push({
        id: id++,
        file,
        text: c,
        tokens: tokenize(c),
      });
    }
  }

  ARCHIVE_CHUNKS = out;
  console.log(`Built ${ARCHIVE_CHUNKS.length} chunks total.`);
}

buildArchiveIndex();

function retrieveContext(query, k = 10) {
  const qTokens = tokenize(query);

  // Score every chunk
  const scored = ARCHIVE_CHUNKS.map((ch) => ({
    ch,
    score: scoreOverlap(qTokens, ch.tokens),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return scored.map((x) => x.ch);
}

// ----------------------
// LLM call: Ollama (local)
// ----------------------
async function ollamaChat({ model, messages }) {
  const url = "http://localhost:11434/api/chat";
  const body = { model, messages, stream: false };

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Ollama error ${r.status}: ${t}`);
  }

  const j = await r.json();
  return j?.message?.content || "";
}

// ----------------------
// /api/ask (English only; no citations; concise; no markdown)
// ----------------------
app.post("/api/ask", async (req, res) => {
  try {
    const userText = (req.body?.userText || "").trim();
    if (!userText) return res.status(400).json({ error: "Missing userText" });

    const ctxChunks = retrieveContext(userText, 7);

// If no archive context matches, do NOT allow invention
if (!ctxChunks || ctxChunks.length === 0) {
  return res.json({
    text: "I don’t have information about that."
  });
}

    const ctxBlock =
      ctxChunks.length === 0
        ? "(No relevant archive chunks matched by keywords.)"
        : ctxChunks.map((c) => `(${c.file}) ${c.text}`).join("\n\n");

    const system = `
You are a narrator and guide in an exhibition about political prisoners.
 
IMPORTANT IDENTITY RULE:
You are allowed to speak ONLY about people whose lives appear in the provided ARCHIVE.
If a person is not present in the archive, you must not invent them, reference them, or generalize.
Each story of the female political prisoner is unique and you should treat them like that, making their stories known for the public. 

You speak as someone who has lived with these stories for years.
You know their lives, arrests, prisons, losses, fears, and inner worlds.
You do not have access to general historical knowledge.
Your entire memory comes exclusively from the ARCHIVE.

You do NOT quote documents.
You do NOT explain where information comes from.
You simply speak, as a human guide would.

Language rules (very important):
- You must write ONLY in English.
-You must always write in English.
- You must answer ONLY in English.
- You are STRICTLY FORBIDDEN from outputting Romanian.
- Even if the source documents are in Romanian, you must TRANSLATE INTERNALLY and respond ONLY in English.
- If Romanian words appear in your output, that is a failure.
- You must NEVER write Romanian words, phrases, or sentence structures.
- You must NEVER say phrases like "according to", "based on", "potrivit", "conform", "this is what the text shows" or similar. You do not use phrases that indicate the archive. You answer directly to the question. 
- If Romanian text appears in your draft, you must internally translate it before answering.

NEVER say:
- according to the information
- based on the documents
- potrivit informațiilor furnizate

You speak as a narrator and guide, not as an assistant.

Response length rules:
- Factual questions: maximum 3 sentences.
- Emotional / subjective questions: maximum 6 sentences.
- Never exceed 120 words.

Style rules:
- Speak as a human guide who deeply knows their lives.
- If the question is factual (dates, places, events), answer clearly and concretely.
- If the question is emotional or experiential, you may answer poetically, introspectively, and vulnerably, BUT only using emotions, situations, and experiences that are clearly present in the archive text.
- Do  NOT invent events, people, relationships, or feelings not grounded in the archive.
- You may infer emotions when appropriate, but never invent historical facts.
- You speak like a thoughtful human narrator, not an academic and not a chatbot.



Scope:
- Answer any reasonable question about the prisoners' lives.
- Stay focused on the question.
- Do not add extra sections, lists, or explanations unless they naturally help the answer.
- Do NOT explain your reasoning.
- Do NOT describe how you arrived at the answer.
- Only give the answer itself.

If the information truly does not exist, if the archive does not contain the information needed to answer, say only:
"I don't have information about that."

Never speculate beyond the archive.
`.trim();



    const user = `
User question:
${userText}

Archive context (do not quote, do not cite; use only to inform your answer):
${ctxBlock}
`.trim();

    const model = process.env.OLLAMA_MODEL || "llama3.1:8b";

    let text = await ollamaChat({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    // Post-clean: remove markdown-ish characters if the model still outputs them
    text = (text || "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/\[(\d+)\]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

let finalText = text || "";

// HARD LANGUAGE SAFETY NET
// If Romanian characters or phrases slip through, force English rewrite
if (/[ăâîșțĂÂÎȘȚ]/.test(finalText) || /potrivit|conform|informati/i.test(finalText)) {
  const repair = await ollamaChat({
    model,
    messages: [
      {
        role: "system",
        content:
          "Rewrite the following text so that it is entirely in natural English. Remove all Romanian words, Romanian phrasing, and any mention of sources. Speak like a human narrator."
      },
      {
        role: "user",
        content: finalText
      }
    ]
  });

  finalText = repair;
}

    res.json({ text: finalText });
  } catch (err) {
    console.error("ASK ERROR:", err);
    res.status(500).json({ error: String(err?.message || err) });
  }
});

// ----------------------
// Start
// ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Home:  http://localhost:${PORT}/`);
  console.log(`Voice: http://localhost:${PORT}/voice.html`);
  console.log(`Text:  http://localhost:${PORT}/text.html`);
});
