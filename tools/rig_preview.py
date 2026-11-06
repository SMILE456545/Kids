"""Собирает героиню из частей (вид сбоку) и рисует кадры ходьбы — для подбора шарниров.
Координаты — «пиксели рига» = система side.png (рост 602, ноги на y=602).
Те же числа используются в js/rig.js.
Запуск: python tools/rig_preview.py <выход.png>
"""
import math
import sys
from pathlib import Path
from PIL import Image

RIG = Path(__file__).resolve().parent.parent / 'assets' / 'girl' / 'rig'
OX, OY = 20, 30   # поля кадра превью

# часть: файл, масштаб, левый-верхний угол картинки в риге, шарнир в риге
PARTS = {
    'torso': ('torso_side.png', 1.0, (0, 226), (120, 452)),
    'head': ('head_side_r.png', 1.14, (4, 6), (150, 236)),
    'arm': ('arm.png', 1.36, (78, 256), (116, 272)),
    'leg': ('leg_side.png', 0.86, (86, 445), (122, 452)),
}
_cache = {}


def part(name, shade):
    key = (name, shade)
    if key not in _cache:
        f, s, _, _ = PARTS[name]
        im = Image.open(RIG / f).convert('RGBA')
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        if shade:
            r, g, b, a = im.split()
            im = Image.merge('RGBA', [c.point(lambda v: int(v * (1 - shade))) for c in (r, g, b)] + [a])
        _cache[key] = im
    return _cache[key]


def place(canvas, name, angle=0, dx=0, dy=0, shade=0.0):
    _, _, tl, piv = PARTS[name]
    im = part(name, shade)
    px, py = piv[0] - tl[0], piv[1] - tl[1]          # шарнир внутри картинки
    W = int(max(im.width, im.height) * 2.4)
    big = Image.new('RGBA', (W, W))
    big.alpha_composite(im, (int(W / 2 - px), int(W / 2 - py)))
    if angle:
        big = big.rotate(-angle, resample=Image.BICUBIC, center=(W / 2, W / 2))
    canvas.alpha_composite(big, (int(OX + piv[0] + dx - W / 2), int(OY + piv[1] + dy - W / 2)))


def frame(t):
    c = Image.new('RGBA', (300, 660), (150, 200, 120, 255))
    ph = math.sin(t * 2 * math.pi)
    bob = -abs(math.cos(t * 2 * math.pi)) * 8
    leg, arm = 24 * ph, 26 * ph
    place(c, 'arm', -arm, 0, bob, shade=0.12)
    place(c, 'leg', -leg, -8, 0, shade=0.12)
    place(c, 'torso', 0, 0, bob)
    place(c, 'leg', leg, 6, 0)
    place(c, 'head', ph * 2, 0, bob)
    place(c, 'arm', arm, 0, bob)
    return c


if __name__ == '__main__':
    frames = [frame(i / 6) for i in range(6)]
    ref = Image.open(RIG.parent / 'side.png').convert('RGBA')
    sheet = Image.new('RGBA', (300 * 7, 660), (255, 255, 255, 255))
    r = Image.new('RGBA', (300, 660), (150, 200, 120, 255)); r.alpha_composite(ref, (OX, OY))
    sheet.alpha_composite(r, (0, 0))
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, (300 * (i + 1), 0))
    sheet.convert('RGB').resize((sheet.width // 2, sheet.height // 2)).save(sys.argv[1])
