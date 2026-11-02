"""One-time download from Google Fonts; deployed pages make no external font requests."""
from pathlib import Path
import re
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parents[1] / 'assets/fonts'
root.mkdir(parents=True, exist_ok=True)
url = 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Playfair+Display:wght@400;600&display=swap'
ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
css = urlopen(Request(url, headers={'User-Agent':ua}), timeout=30).read().decode()
for address in set(re.findall(r'url\((https://[^)]+)\)', css)):
    name = address.rsplit('/',1)[-1]
    (root / name).write_bytes(urlopen(address, timeout=30).read())
    css = css.replace(address, '/assets/fonts/' + name)
(root / 'fonts.css').write_text(css, encoding='utf-8')
for family, location in [('Lato', 'ofl/lato/OFL.txt'), ('Playfair-Display', 'ofl/playfairdisplay/OFL.txt')]:
    (root / (family + '-OFL.txt')).write_bytes(urlopen('https://raw.githubusercontent.com/google/fonts/main/' + location, timeout=30).read())
print('Font files downloaded:', len(list(root.glob('*'))))
