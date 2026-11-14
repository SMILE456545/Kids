"""Сборка овечки из деталей assets/animal_parts/sheep2 — подбор положений (числа те же, что в js/rig.js SHEEP2).
Каждая деталь: (картинка, масштаб, левый-верхний угол в пикселях рига). Опора (ноги) — y = H.
Запуск: python tools/sheep2_preview.py <выход.png> [sheep2|goat2]
"""
import sys, json
from pathlib import Path
from PIL import Image

ANIMAL = sys.argv[2] if len(sys.argv) > 2 else 'sheep2'   # sheep2 | goat2
D = Path(__file__).resolve().parent.parent / 'assets' / 'animal_parts' / ANIMAL
RIG = json.loads((Path(__file__).resolve().parent / f'{ANIMAL}_rig.json').read_text(encoding='utf-8'))


def part(name, s):
    im = Image.open(D / f'{name}.png').convert('RGBA')
    return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)


def shade(im, a):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, al = px[x, y]
            if al: px[x, y] = (int(r * (1 - a)), int(g * (1 - a)), int(b * (1 - a)), al)
    return im


def view(v, legrot=(0, 0, 0, 0), lift=(0, 0)):
    R = RIG[v]; W, H = 300, R['H'] + 20
    c = Image.new('RGBA', (W, H), (80, 140, 60, 255))
    ox = 150 - R['root'][0]
    for p in R['order']:
        d = R['parts'][p]
        im = part(d['img'], d['s'])
        if d.get('flip'): im = im.transpose(Image.FLIP_LEFT_RIGHT)
        if d.get('sx'):   # растянуть по ширине вокруг шарнира
            nw = round(im.width * d['sx']); px = d['piv'][0] - d['tl'][0]; d = dict(d, tl=[d['piv'][0] - px * d['sx'], d['tl'][1]]); im = im.resize((nw, im.height), Image.LANCZOS)
        if d.get('shade'): im = shade(im, d['shade'])
        x, y = d['tl']
        if d.get('flip') and 'piv' in d: x = 2 * d['piv'][0] - x - im.width   # как в игре: зеркально вокруг шарнира
        if 'piv' in d and p.startswith('leg'):
            i = int(p[-1]); ang = legrot[i] if v == 'side' else 0
            if v != 'side': y += lift[i]
            if ang:
                px, py = d['piv'][0] - x, d['piv'][1] - y
                big = Image.new('RGBA', (im.width * 3, im.height * 3)); big.alpha_composite(im, (im.width, im.height))
                big = big.rotate(ang, center=(im.width + px, im.height + py))
                c.alpha_composite(big, (int(x - im.width + ox), int(y - im.height)))
                continue
        c.alpha_composite(im, (int(x + ox), int(y)))
    if R.get('sx'): c = c.resize((round(W * R['sx']), H), Image.LANCZOS); b = Image.new('RGBA', (W, H), (80, 140, 60, 255)); b.paste(c, ((W - c.width) // 2, 0)); c = b
    return c


out = Image.new('RGB', (1500, 900), (80, 140, 60))
for i, v in enumerate(['side', 'front', 'back']):
    out.paste(view(v).convert('RGB'), (i * 300, 0))
out.paste(view('side', (22, -22, -22, 22)).convert('RGB'), (900, 0))
out.paste(view('front', lift=(-14, 0)).convert('RGB'), (1200, 0))
out.save(sys.argv[1])
