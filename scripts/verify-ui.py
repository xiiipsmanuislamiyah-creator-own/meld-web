import json
import subprocess
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path("/home/rdev/meld-web")
OUT_DIR = Path("/home/rdev/.gemini/antigravity-cli/brain/93765389-4c8a-4b2a-bfa7-53709c888ad7/scratch/qa")
OUT_DIR.mkdir(parents=True, exist_ok=True)

server = subprocess.Popen(
    [str(ROOT / "node_modules" / ".bin" / "vite"), "--host", "127.0.0.1", "--port", "4179", "--strictPort"],
    cwd=str(ROOT),
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)

def wait_server(url: str, timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=2) as r:
                if r.status == 200:
                    return True
        except Exception:
            time.sleep(0.4)
    return False

try:
    if not wait_server("http://127.0.0.1:4179/"):
        raise RuntimeError("Vite dev server failed to start on port 4179")

    # 1. Verify live serverless API routes
    print("=== API SMOKE TESTS ===")
    for name, path in [
        ("home", "/api/home?mood=all"),
        ("search", "/api/search?q=Brambles+Unsayable&filter=songs"),
        ("browse", "/api/browse?id=MPREb_mtYHswx845I"),
        ("upnext", "/api/upnext?videoId=HfxutEFLqEw"),
        ("lyrics", "/api/lyrics?title=Lowkey&artist=NIKI"),
        ("spotify", "/api/spotify-import?url=https%3A%2F%2Fopen.spotify.com%2Fplaylist%2F37i9dQZF1DXcBWIGoYBM5M"),
    ]:
        with urllib.request.urlopen(f"http://127.0.0.1:4179{path}", timeout=20) as r:
            body = json.loads(r.read())
            summary = ""
            if name == "home":
                summary = f"quickPicks={len(body.get('quickPicks', []))}, shelves={len(body.get('shelves', []))}"
            elif name == "search":
                summary = f"tracks={len(body.get('tracks', []))}"
            elif name == "browse":
                summary = f"title={body.get('title')}, tracks={len(body.get('tracks', []))}"
            elif name == "upnext":
                summary = f"tracks={len(body.get('tracks', []))}"
            elif name == "lyrics":
                summary = f"found={body.get('found')}, synced={body.get('synced')}, lines={len(body.get('lines', []))}"
            elif name == "spotify":
                summary = f"title={body.get('title')}, tracks={len(body.get('tracks', []))}"
            print(f"PASS /api/{name}: HTTP {r.status} | {summary}")

    # 2. Headless Visual & Functional Browser QA
    print("\n=== BROWSER VISUAL & INTERACTION QA ===")
    console_errors = []
    page_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch()

        # Desktop 1440x900 Light Mode Home
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: page_errors.append(str(e)))

        page.goto("http://127.0.0.1:4179/", wait_until="networkidle")
        page.wait_for_selector(".featured-banner", timeout=15000)
        page.evaluate("() => document.fonts.ready")
        time.sleep(0.8)

        overflow_desktop = page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
        print(f"Desktop 1440x900 overflow: {overflow_desktop}")
        page.screenshot(path=str(OUT_DIR / "01_desktop_light_home.png"))

        # Click "Listen Now" to activate floating dock + waveform + live palette
        page.click(".featured-actions .btn-primary")
        time.sleep(1.5)
        page.wait_for_selector(".player-dock", timeout=10000)
        page.screenshot(path=str(OUT_DIR / "02_desktop_light_playing.png"))

        # Click "Open Album" -> Charcoal album view
        page.click(".featured-actions .btn-secondary")
        page.wait_for_selector(".collection-header", timeout=15000)
        time.sleep(1.0)
        page.screenshot(path=str(OUT_DIR / "03_desktop_album_charcoal.png"))

        # Open Full-Screen Now Playing
        page.click(".dock-track")
        page.wait_for_selector(".now-playing-backdrop", timeout=8000)
        time.sleep(0.8)
        page.screenshot(path=str(OUT_DIR / "04_desktop_now_playing_light.png"))

        # Toggle Adaptive Dark Mode inside Now Playing
        page.click(".np-topbar button[aria-label*='dark']")
        time.sleep(0.6)
        page.screenshot(path=str(OUT_DIR / "05_desktop_now_playing_dark.png"))

        # Close Now Playing and inspect Adaptive Dark Mode Album/Home
        page.click(".np-topbar button[aria-label*='Collapse']")
        time.sleep(0.5)
        page.screenshot(path=str(OUT_DIR / "06_desktop_dark_album.png"))

        # Laptop 1280x800 check
        page.set_viewport_size({"width": 1280, "height": 800})
        page.click(".sidebar button[aria-label='Meld Home']")
        time.sleep(0.7)
        overflow_laptop = page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
        print(f"Laptop 1280x800 overflow: {overflow_laptop}")
        ctx.close()

        # Mobile 390x844 (Light Mode + Floating Dark Dock + Album View)
        mctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True)
        mpage = mctx.new_page()
        mpage.goto("http://127.0.0.1:4179/", wait_until="networkidle")
        mpage.wait_for_selector(".featured-banner", timeout=15000)
        mpage.evaluate("() => document.fonts.ready")
        time.sleep(0.8)
        overflow_mobile = mpage.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
        print(f"Mobile 390x844 overflow: {overflow_mobile}")

        # Start playback so signature floating dark mini-player dock renders above mobile bottom nav
        mpage.click(".featured-actions .btn-primary")
        mpage.wait_for_selector(".player-dock", timeout=10000)
        time.sleep(1.0)
        mpage.screenshot(path=str(OUT_DIR / "07_mobile_light_home_dock.png"))

        # Navigate to Charcoal album on mobile (exact match to Tuan Rahmat's right phone mockup!)
        mpage.click(".featured-actions .btn-secondary")
        mpage.wait_for_selector(".collection-header", timeout=15000)
        time.sleep(1.0)
        mpage.screenshot(path=str(OUT_DIR / "08_mobile_light_album_dock.png"))

        # Open Now Playing on mobile (exact match to Tuan Rahmat's left phone mockup!)
        mpage.click(".dock-track")
        mpage.wait_for_selector(".now-playing-backdrop", timeout=8000)
        time.sleep(0.8)
        mpage.screenshot(path=str(OUT_DIR / "09_mobile_now_playing_light.png"))
        mctx.close()

        browser.close()

    # Filter out harmless third-party YouTube iframe postMessage/ad warnings if any
    real_errors = [e for e in console_errors if "youtube" not in e.lower() and "doubleclick" not in e.lower()]
    print(f"\nConsole errors (app): {len(real_errors)} | Page errors: {len(page_errors)}")
    if real_errors:
        print("App console errors:", real_errors)
    if page_errors:
        print("Page errors:", page_errors)
finally:
    server.terminate()
    try:
        server.wait(timeout=5)
    except Exception:
        server.kill()
