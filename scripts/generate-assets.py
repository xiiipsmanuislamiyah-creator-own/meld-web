import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path("/home/rdev/meld-web")
PUBLIC = ROOT / "public"
FAVICON_SVG = (PUBLIC / "favicon.svg").read_text()

BANNER_HTML = f"""<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=JetBrains+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap" rel="stylesheet" />
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1200px;
    height: 630px;
    background:
      radial-gradient(ellipse 75% 70% at 78% 18%, rgba(38, 72, 105, 0.14) 0%, transparent 64%),
      radial-gradient(ellipse 55% 60% at 15% 95%, rgba(200, 93, 50, 0.09) 0%, transparent 60%),
      #F6F4EF;
    font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
    color: #16171B;
    display: grid;
    grid-template-columns: 1.08fr 0.92fr;
    align-items: center;
    padding: 54px 64px;
    gap: 44px;
    overflow: hidden;
  }}
  .left {{
    display: flex;
    flex-direction: column;
    gap: 22px;
  }}
  .brand {{
    display: flex;
    align-items: center;
    gap: 14px;
  }}
  .brand-icon {{
    width: 56px;
    height: 56px;
  }}
  .brand-name {{
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.05;
  }}
  .brand-tag {{
    font-size: 14px;
    color: #5A5C66;
    font-weight: 600;
  }}
  h1 {{
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 56px;
    font-weight: 700;
    line-height: 1.03;
    letter-spacing: -0.03em;
    color: #16171B;
  }}
  .sub {{
    font-size: 19px;
    line-height: 1.48;
    color: #44464E;
    max-width: 470px;
  }}
  .chips {{
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    padding-top: 6px;
  }}
  .chip {{
    padding: 8px 14px;
    border-radius: 999px;
    background: #FCFBF8;
    box-shadow: 0 2px 10px rgba(18, 20, 26, 0.07);
    font-size: 13px;
    font-weight: 600;
    color: #264869;
    white-space: nowrap;
  }}
  .chip.dark {{
    background: #171B22;
    color: #F6F4EF;
  }}
  .right {{
    position: relative;
    height: 530px;
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  .deck-light {{
    width: 300px;
    background: #FCFBF8;
    border-radius: 28px;
    padding: 20px;
    box-shadow: 0 24px 60px -12px rgba(23, 27, 34, 0.22), 0 2px 8px rgba(23, 27, 34, 0.06);
    display: flex;
    flex-direction: column;
    gap: 12px;
    transform: translate(-52px, -42px);
  }}
  .art {{
    width: 100%;
    aspect-ratio: 1;
    border-radius: 18px;
    background:
      linear-gradient(145deg, #1F2A38 0%, #11161F 55%, #1E2D3D 100%);
    box-shadow: 0 14px 28px -8px rgba(23, 27, 34, 0.36);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  .art-ring {{
    width: 68%;
    height: 68%;
    border-radius: 999px;
    background:
      radial-gradient(circle at 38% 36%, #F2F5F8 0%, #CFD8E3 32%, #8699AF 66%, #2F4054 100%);
    box-shadow: inset 0 0 0 14px rgba(18, 23, 31, 0.24), 0 10px 24px rgba(0, 0, 0, 0.35);
    position: relative;
  }}
  .art-ring::after {{
    content: "";
    position: absolute;
    inset: 34%;
    border-radius: 999px;
    background: #171E28;
    box-shadow: 0 0 0 3px rgba(246, 244, 239, 0.35);
  }}
  .track-name {{
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 21px;
    font-weight: 700;
    text-align: center;
    color: #16171B;
  }}
  .track-artist {{
    font-size: 13px;
    text-align: center;
    color: #5A5C66;
    margin-top: -8px;
  }}
  .wave {{
    display: flex;
    align-items: center;
    gap: 3px;
    height: 32px;
    padding: 0 2px;
  }}
  .bar {{
    flex: 1;
    border-radius: 99px;
    background: #D4D2CA;
  }}
  .bar.on {{
    background: #264869;
  }}
  .times {{
    display: flex;
    justify-content: space-between;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #5A5C66;
    margin-top: -6px;
  }}
  .controls {{
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 22px;
    padding-top: 2px;
  }}
  .play-circle {{
    width: 48px;
    height: 48px;
    border-radius: 999px;
    background: #171B22;
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  .dock-float {{
    position: absolute;
    right: -12px;
    bottom: 6px;
    width: 316px;
    background: #171B22;
    color: #F6F4EF;
    border-radius: 22px;
    padding: 13px 16px;
    box-shadow: 0 22px 46px -8px rgba(12, 14, 18, 0.45);
    border: 1px solid rgba(255,255,255,0.12);
    display: flex;
    align-items: center;
    gap: 12px;
  }}
  .dock-thumb {{
    width: 44px;
    height: 44px;
    border-radius: 11px;
    background: radial-gradient(circle at 46% 45%, #E7EDF3 0%, #3E526A 60%, #151B24 100%);
    flex-shrink: 0;
  }}
  .dock-meta {{
    flex: 1;
  }}
  .dock-t {{
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 15px;
    font-weight: 700;
  }}
  .dock-a {{
    font-size: 12px;
    color: #B9C0CC;
  }}
  .dock-pill {{
    width: 36px;
    height: 36px;
    border-radius: 999px;
    background: #F6F4EF;
    display: flex;
    align-items: center;
    justify-content: center;
  }}
  .swatches {{
    position: absolute;
    right: 6px;
    top: 32px;
    background: #FCFBF8;
    border-radius: 18px;
    padding: 12px 14px;
    box-shadow: 0 12px 30px -8px rgba(23, 27, 34, 0.16);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }}
  .sw-label {{
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #5A5C66;
    font-weight: 600;
  }}
  .sw-dots {{
    display: flex;
    gap: 8px;
  }}
  .sw-dot {{
    width: 24px;
    height: 24px;
    border-radius: 7px;
  }}
</style>
</head>
<body>
  <div class="left">
    <div class="brand">
      <div class="brand-icon">{FAVICON_SVG}</div>
      <div>
        <div class="brand-name">Meld</div>
        <div class="brand-tag">Open Music Web</div>
      </div>
    </div>
    <h1>Tactile sound.<br/>Cover-adaptive tone.</h1>
    <p class="sub">
      Stream YouTube Music, import public Spotify playlists, follow synced lyrics, and watch light and dark surfaces breathe with every album sleeve.
    </p>
    <div class="chips">
      <span class="chip dark">Client-Side Audio</span>
      <span class="chip">Spotify Import</span>
      <span class="chip">Synced Lyrics</span>
      <span class="chip">Adaptive Chroma</span>
    </div>
  </div>

  <div class="right">
    <div class="deck-light">
      <div class="art"><div class="art-ring"></div></div>
      <div class="track-name">Unsayable</div>
      <div class="track-artist">Brambles — Charcoal</div>
      <div class="wave">
        {"".join(
            f'<span class="bar{" on" if i < 20 else ""}" style="height:{h}%"></span>'
            for i, h in enumerate([22,38,54,40,68,85,56,74,94,62,48,80,100,72,58,86,66,44,78,92,60,46,74,88,52,38,68,82,56,42,64,48,34,26])
        )}
      </div>
      <div class="times"><span>1:04</span><span>2:53</span></div>
      <div class="controls">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#171B22"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
        <div class="play-circle">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#F6F4EF"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#171B22"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
      </div>
    </div>

    <div class="swatches">
      <div class="sw-label">LIVE CHROMA</div>
      <div class="sw-dots">
        <span class="sw-dot" style="background:#264869"></span>
        <span class="sw-dot" style="background:#8EB8E5"></span>
        <span class="sw-dot" style="background:#D7E2EE"></span>
        <span class="sw-dot" style="background:#171B22"></span>
      </div>
    </div>

    <div class="dock-float">
      <div class="dock-thumb"></div>
      <div class="dock-meta">
        <div class="dock-t">Unsayable</div>
        <div class="dock-a">Brambles — Playing</div>
      </div>
      <div class="dock-pill">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#171B22"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
      </div>
    </div>
  </div>
</body>
</html>
"""

with sync_playwright() as p:
    browser = p.chromium.launch()
    # 1. Render PNG App Icons cleanly from favicon.svg
    for size, filename in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
        page = browser.new_page(viewport={"width": size, "height": size}, device_scale_factor=1)
        page.set_content(f"""<!doctype html><html><body style="margin:0;padding:0;background:transparent;width:{size}px;height:{size}px;display:flex;align-items:center;justify-content:center;">{FAVICON_SVG.replace('<svg ', f'<svg width="{size}" height="{size}" ')}</body></html>""")
        page.screenshot(path=str(PUBLIC / filename), omit_background=True)
        page.close()
        print(f"Generated {filename} ({size}x{size})")

    # 2. Render 1200x630 Open Graph Web Banner
    banner_page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
    banner_page.set_content(BANNER_HTML, wait_until="networkidle")
    banner_page.evaluate("() => document.fonts.ready")
    banner_page.screenshot(path=str(PUBLIC / "og-banner.png"))
    banner_page.close()
    print("Generated og-banner.png (1200x630)")
    browser.close()
