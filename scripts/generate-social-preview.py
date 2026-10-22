"""Code-drawn, optimized social preview (no third-party cover art)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[1]
im = Image.new('RGB', (1200, 630), '#f5f3eb')
d = ImageDraw.Draw(im)
serif = '/System/Library/Fonts/Supplemental/Georgia.ttf'
italic = '/System/Library/Fonts/Supplemental/Georgia Italic.ttf'
sans = '/System/Library/Fonts/Supplemental/Arial.ttf'
f = lambda path, size: ImageFont.truetype(path, size)
d.line((64, 70, 1136, 70), fill='#d5d7ca', width=2)
d.text((64, 94), 'Paginae.', font=f(serif, 55), fill='#753e49')
d.text((65, 216), 'Tieni il filo.', font=f(serif, 80), fill='#262d27')
d.text((65, 305), 'Di ogni storia.', font=f(italic, 80), fill='#753e49')
d.text((68, 456), 'La tua libreria, le tue scoperte, le tue parole.', font=f(sans, 25), fill='#666b60')
# Original geometric book illustration.
for x, y, w, h, color in [(875, 186, 66, 300, '#753e49'), (951, 154, 58, 332, '#929b7a'), (1019, 228, 70, 258, '#bba781')]:
    d.rounded_rectangle((x, y, x+w, y+h), radius=3, fill=color)
    d.line((x+10,y+24,x+w-10,y+24), fill='#f5f3eb', width=2)
    d.line((x+10,y+h-27,x+w-10,y+h-27), fill='#f5f3eb', width=2)
d.line((844, 494, 1120, 494), fill='#262d27', width=3)
d.line((64, 551, 1136, 551), fill='#d5d7ca', width=2)
d.text((68, 574), 'UN POSTO PER LE TUE LETTURE', font=f(sans, 17), fill='#666b60')
d.text((912, 574), 'paginae.lovable.app', font=f(sans, 17), fill='#666b60')
output = root/'public/images/paginae-social.png'
im.save(output, optimize=True)
print(f'{output.name}: {output.stat().st_size:,} bytes, 1200 × 630')
