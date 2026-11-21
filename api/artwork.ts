import type { VercelRequest, VercelResponse } from "@vercel/node";

const ALLOWED_HOSTS = new Set([
  "lh3.googleusercontent.com",
  "yt3.googleusercontent.com",
  "i.ytimg.com",
  "i.scdn.co",
  "mosaic.scdn.co",
  "image-cdn-ak.spotifycdn.com",
  "image-cdn-fa.spotifycdn.com",
  "seeded-session-images.scdn.co",
  "wrapped-images.spotifycdn.com",
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const raw = String(req.query.url || "").trim();
  if (!raw) {
    return res.status(400).json({ error: "Missing url" });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return res.status(400).json({ error: "Invalid url" });
  }

  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return res.status(403).json({ error: "Host not permitted" });
  }

  try {
    const imgRes = await fetch(target.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MeldWeb/1.0)",
        Accept: "image/avif,image/webp,image/jpeg,image/png,*/*",
      },
    });
    if (!imgRes.ok) {
      return res.status(imgRes.status).end();
    }

    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800");
    return res.status(200).send(buffer);
  } catch {
    return res.status(502).end();
  }
}
