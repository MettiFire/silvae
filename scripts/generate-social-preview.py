"""Code-drawn, optimized social preview (no third-party cover art)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]

# Same look on macOS and Linux: pick the first font that actually exists here.
CANDIDATES = {
    'serif': ['Georgia', 'Liberation Serif', 'Noto Serif', 'DejaVu Serif'],
    'italic': ['Georgia Italic', 'Liberation Serif Italic', 'Noto Serif Italic', 'DejaVu Serif Italic'],
    'sans': ['Arial', 'Liberation Sans', 'Noto Sans', 'DejaVu Sans'],
}

def resolve(kind):
    import subprocess
    try:
        listing = subprocess.run(['fc-list', ':style=' + {
            'serif': 'Regular', 'italic': 'Italic', 'sans': 'Regular'}[kind],
            '-f', '%{family}|%{file}\n'], capture_output=True, text=True, timeout=15).stdout
    except Exception:
        listing = ''
    wanted = [c.lower() for c in CANDIDATES[kind]]
    for name in wanted:
        for line in listing.splitlines():
            family, _, path = line.partition('|')
            if name in family.lower() and path.endswith('.ttf') and Path(path).exists():
                return path
    raise SystemExit(f'No font found for {kind}')

serif = resolve('serif')
italic = resolve('italic')
sans = resolve('sans')
f = lambda path, size: ImageFont.truetype(path, size)

im = Image.new('RGB', (1200, 630), '#f5f3eb')
d = ImageDraw.Draw(im)
d.line((64, 70, 1136, 70), fill='#d5d7ca', width=2)
d.text((64, 94), 'Silvae.', font=f(serif, 55), fill='#753e49')
d.text((65, 216), 'Tieni il filo.', font=f(serif, 80), fill='#262d27')
d.text((65, 305), 'Di ogni storia.', font=f(italic, 80), fill='#753e49')
d.text((68, 456), 'La tua libreria, le tue scoperte, le tue parole.', font=f(sans, 25), fill='#666b60')
# Original geometric book illustration.
for x, y, w, h, color in [(875, 186, 66, 300, '#753e49'), (951, 154, 58, 332, '#929b7a'), (1019, 228, 70, 258, '#bba781')]:
    d.rounded_rectangle((x, y, x+w, y+h), radius=3, fill=color)
    d.line((x+10, y+24, x+w-10, y+24), fill='#f5f3eb', width=2)
    d.line((x+10, y+h-27, x+w-10, y+h-27), fill='#f5f3eb', width=2)
d.line((844, 494, 1120, 494), fill='#262d27', width=3)
d.line((64, 551, 1136, 551), fill='#d5d7ca', width=2)
d.text((68, 574), 'UN POSTO PER LE TUE LETTURE', font=f(sans, 17), fill='#666b60')
d.text((912, 574), 'silvae.lovable.app', font=f(sans, 17), fill='#666b60')
output = root / 'public/images/silvae-social.png'
im.save(output, optimize=True)
print(f'{output.name}: {output.stat().st_size:,} bytes, 1200 × 630')
