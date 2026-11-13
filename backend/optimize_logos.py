import os
import json
import io
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

BASE_DIR = "/root/PS_AI"
DATA_DIR = os.path.join(BASE_DIR, "data")
PUBLIC_LOGOS = os.path.join(BASE_DIR, "frontend", "public", "logos")
DIST_LOGOS = os.path.join(BASE_DIR, "frontend", "dist", "logos")

os.makedirs(PUBLIC_LOGOS, exist_ok=True)
os.makedirs(DIST_LOGOS, exist_ok=True)

# 1. Optimize main site logo: logo-putih.png
def optimize_main_logo():
    src_logo = os.path.join(BASE_DIR, "frontend", "public", "logo-putih.png")
    if os.path.exists(src_logo):
        try:
            im = Image.open(src_logo)
            w, h = im.size
            # Scale down to 500px width (crisp for 2x retina display at 34px height)
            if w > 500:
                new_h = int(h * (500.0 / w))
                im_small = im.resize((500, new_h), Image.Resampling.LANCZOS)
                # Save optimized WebP and PNG
                im_small.save(os.path.join(BASE_DIR, "frontend", "public", "logo-putih.webp"), format="WEBP", quality=90)
                im_small.save(os.path.join(BASE_DIR, "frontend", "public", "logo-putih.png"), format="PNG", optimize=True)
                
                # Copy to dist
                dist_dir = os.path.join(BASE_DIR, "frontend", "dist")
                if os.path.exists(dist_dir):
                    im_small.save(os.path.join(dist_dir, "logo-putih.webp"), format="WEBP", quality=90)
                    im_small.save(os.path.join(dist_dir, "logo-putih.png"), format="PNG", optimize=True)
                print(f"Main logo optimized: original {w}x{h} -> 500x{new_h} WebP/PNG")
        except Exception as e:
            print(f"Main logo optimize error: {e}")

optimize_main_logo()

# 2. Process all emiten logos
emitens_file = os.path.join(DATA_DIR, "emitens.json")
with open(emitens_file, "r", encoding="utf-8") as f:
    emitens = json.load(f)

print(f"Memproses {len(emitens)} emiten...")

def process_ticker(ticker):
    clean = ticker.upper().strip()
    webp_path = os.path.join(PUBLIC_LOGOS, f"{clean}.webp")
    png_path = os.path.join(PUBLIC_LOGOS, f"{clean}.png")

    if os.path.exists(webp_path) and os.path.exists(png_path) and os.path.getsize(webp_path) > 100:
        return clean, True, "cached"

    # Try Invezgo first, then Stockbit
    urls = [
        f"https://storage.invezgo.com/icon/{clean}.png",
        f"https://assets.stockbit.com/logos/companies/{clean}.png"
    ]

    img_data = None
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=4) as resp:
                if resp.status == 200:
                    data = resp.read()
                    if len(data) > 100:
                        img_data = data
                        break
        except Exception:
            continue

    if not img_data:
        # Check if local SVG exists in logo-emiten
        svg_file = os.path.join(BASE_DIR, "frontend", "public", "logo-emiten", f"{clean}.svg")
        if os.path.exists(svg_file):
            return clean, True, "svg_fallback"
        return clean, False, "not_found"

    try:
        im = Image.open(io.BytesIO(img_data)).convert("RGBA")
        im.thumbnail((96, 96), Image.Resampling.LANCZOS)
        
        # Save as WebP
        im.save(webp_path, format="WEBP", quality=85, method=4)
        
        # Save as PNG
        im.save(png_path, format="PNG", optimize=True)
        
        # Also copy directly to dist
        dist_webp = os.path.join(DIST_LOGOS, f"{clean}.webp")
        dist_png = os.path.join(DIST_LOGOS, f"{clean}.png")
        im.save(dist_webp, format="WEBP", quality=85, method=4)
        im.save(dist_png, format="PNG", optimize=True)
        
        return clean, True, "downloaded"
    except Exception as e:
        return clean, False, str(e)

success_count = 0
fail_count = 0

with ThreadPoolExecutor(max_workers=16) as executor:
    futures = {executor.submit(process_ticker, e["ticker"]): e["ticker"] for e in emitens}
    for future in as_completed(futures):
        t = futures[future]
        try:
            clean, ok, status = future.result()
            if ok:
                success_count += 1
            else:
                fail_count += 1
        except Exception as e:
            fail_count += 1

print(f"Selesai! Berhasil diproses: {success_count}, Gagal/Fallback: {fail_count}")
