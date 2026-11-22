import type { VercelRequest, VercelResponse } from "@vercel/node";

const ALLOWED_LANGS: Record<string, string> = {
  id: "Indonesian",
  en: "English",
  ms: "Malay",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  es: "Spanish",
  fr: "French",
};

interface TranslateRequestBody {
  lines?: string[];
  targetLang?: string;
  trackTitle?: string;
  artist?: string;
}

async function translateWithGemini(
  lines: string[],
  targetLang: string,
  trackTitle?: string,
  artist?: string,
): Promise<string[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const langName = ALLOWED_LANGS[targetLang] || "Indonesian";
  const prompt = [
    `Translate the following song lyrics line-by-line into natural, expressive ${langName}.`,
    trackTitle ? `Song: "${trackTitle}"${artist ? ` by ${artist}` : ""}.` : "",
    `Return ONLY a valid JSON array of strings with the EXACT SAME length (${lines.length}) as the input array.`,
    `Keep empty or purely vocalized lines concise.`,
    `Input JSON:`,
    JSON.stringify(lines),
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.25,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    if (!res.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json();
    const rawText: string =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = rawText.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length === lines.length) {
      return parsed.map((item) => String(item ?? "").trim());
    }
    return null;
  } catch {
    return null;
  }
}

async function translateWithClients5(
  lines: string[],
  targetLang: string,
): Promise<string[] | null> {
  try {
    const results: string[] = [];
    const CHUNK_SIZE = 16;
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      const slice = lines.slice(i, i + CHUNK_SIZE);
      const joined = slice.map((l) => l.replace(/\r?\n/g, " ").trim() || "—").join("\n");
      const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${encodeURIComponent(targetLang)}&q=${encodeURIComponent(joined)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (!res.ok) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      let fullText = "";
      if (Array.isArray(data) && Array.isArray(data[0]) && typeof data[0][0] === "string") {
        fullText = data[0][0];
      } else if (Array.isArray(data) && typeof data[0] === "string") {
        fullText = data[0];
      } else {
        return null;
      }
      const splitLines = fullText.split(/\r?\n/).map((s) => s.trim());
      for (let j = 0; j < slice.length; j++) {
        results.push(slice[j].trim() ? (splitLines[j] ?? slice[j]) : "");
      }
    }
    return results;
  } catch {
    return null;
  }
}

async function translateWithMyMemory(
  lines: string[],
  targetLang: string,
): Promise<string[] | null> {
  try {
    const results: string[] = [];
    const CHUNK_SIZE = 6;
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      const slice = lines.slice(i, i + CHUNK_SIZE);
      const joined = slice.map((l) => l.replace(/\r?\n/g, " ").trim() || "—").join(" || ");
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(joined)}&langpair=autodetect|${encodeURIComponent(targetLang)}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      const translated: string = data?.responseData?.translatedText || "";
      if (!translated) return null;
      const parts = translated.split(/\s*\|\|\s*/).map((s) => s.trim());
      for (let j = 0; j < slice.length; j++) {
        results.push(slice[j].trim() ? (parts[j] ?? slice[j]) : "");
      }
    }
    return results;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");

  let lines: string[] = [];
  let targetLang = "id";
  let trackTitle: string | undefined;
  let artist: string | undefined;

  if (req.method === "POST") {
    const body = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}) as TranslateRequestBody;
    lines = Array.isArray(body.lines) ? body.lines.map((l) => String(l ?? "")) : [];
    targetLang = String(body.targetLang || "id").toLowerCase();
    trackTitle = body.trackTitle ? String(body.trackTitle) : undefined;
    artist = body.artist ? String(body.artist) : undefined;
  } else {
    const q = String(req.query.q || "").trim();
    targetLang = String(req.query.target || "id").toLowerCase();
    if (q) lines = q.split(/\r?\n/);
  }

  if (!ALLOWED_LANGS[targetLang]) {
    targetLang = "id";
  }

  if (lines.length === 0) {
    return res.status(400).json({ error: "No lyric lines supplied" });
  }

  const safeLines = lines.slice(0, 160);

  try {
    const geminiResult = await translateWithGemini(safeLines, targetLang, trackTitle, artist);
    if (geminiResult) {
      return res.status(200).json({
        translations: geminiResult,
        targetLang,
        engine: "gemini-ai",
      });
    }

    const neuralResult = await translateWithClients5(safeLines, targetLang);
    if (neuralResult) {
      return res.status(200).json({
        translations: neuralResult,
        targetLang,
        engine: "neural-translate",
      });
    }

    const myMemoryResult = await translateWithMyMemory(safeLines, targetLang);
    if (myMemoryResult) {
      return res.status(200).json({
        translations: myMemoryResult,
        targetLang,
        engine: "mymemory-fallback",
      });
    }

    return res.status(502).json({
      error: "Layanan terjemahan sedang sibuk. Coba beberapa saat lagi.",
    });
  } catch (err) {
    console.error("[api/translate]", err);
    return res.status(502).json({
      error: "Layanan terjemahan sedang sibuk. Coba beberapa saat lagi.",
    });
  }
}
