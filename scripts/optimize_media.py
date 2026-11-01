"""Regenerate web images from preserved originals. Requires Pillow (not needed to build/deploy)."""
import json
import subprocess
import tempfile
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'images'
OUT.mkdir(parents=True, exist_ok=True)
books = json.loads((ROOT / 'data/books.json').read_text(encoding='utf-8'))
manifest = {}
original_bytes = 0
for book in books:
    items = []
    for index, source in enumerate(book['sources'], 1):
        path = ROOT / source
        original_bytes += path.stat().st_size
        with Image.open(path) as source_image:
            im = ImageOps.exif_transpose(source_image).convert('RGB')
            variants = []
            for width in sorted(set(min(w, im.width) for w in [160, 320, 640, 1200])):
                resized = im.copy()
                resized.thumbnail((width, 10000), Image.Resampling.LANCZOS)
                name = f'{book["slug"]}-{index}-{width}.webp'
                resized.save(OUT / name, 'WEBP', quality=82, method=6)
                variants.append({'src': '/assets/images/' + name, 'width': resized.width, 'height': resized.height})
            items.append({'alt': f'{book["title"]} — photographie {index} sur {len(book["sources"])}', 'variants': variants})
    manifest[str(book['id'])] = items
# A frame of the existing ambiance video avoids overlaying text on the old promotional banner.
with tempfile.TemporaryDirectory() as temp:
    poster = Path(temp) / 'poster.png'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', '3', '-i', str(ROOT / 'Vidéos/Bannières/Vidéo_Bannière_2.5Mbps.mp4'), '-frames:v', '1', str(poster)], check=True)
    with Image.open(poster) as source_image:
        im = source_image.convert('RGB')
        for width in [640, 1280, 1536]:
            resized = im.copy()
            resized.thumbnail((width, 10000), Image.Resampling.LANCZOS)
            resized.save(OUT / f'banniere-{width}.webp', 'WEBP', quality=82, method=6)
with Image.open(ROOT / 'Logos/L’Atelier des Mémoires Logo.png') as source_image:
    im = source_image.convert('RGBA')
    for size in [32, 80, 180]:
        im.resize((size, size), Image.Resampling.LANCZOS).save(OUT / f'logo-{size}.png', optimize=True)
(ROOT / 'data/media.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'original_product_bytes':original_bytes, 'optimized_all_variants_bytes':sum(p.stat().st_size for p in OUT.glob('*'))}))
# Contact sheet is a local review artifact, never published.
sheet = Image.new('RGB', (1000, 7*220), 'white')
draw = ImageDraw.Draw(sheet)
for row, book in enumerate(books):
    for col, source in enumerate(book['sources'][:4]):
        with Image.open(ROOT / source) as im:
            im = ImageOps.exif_transpose(im).convert('RGB')
            im.thumbnail((240, 190))
            sheet.paste(im, (col*250, row*220))
        draw.text((col*250+4, row*220+192), f'{book["id"]} / {col+1}', fill='black')
sheet.save(ROOT / 'media-review.jpg')
