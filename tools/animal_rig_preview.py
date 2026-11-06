"""Собирает овцу/козу из деталей (вид сбоку, мордой влево) и рисует кадры ходьбы и щипания травы.
Координаты — пиксели листа деталей. Те же числа — в js/rig.js (ANIMAL_RIGS).
Запуск: python tools/animal_rig_preview.py <sheep|goat> <выход.png>
"""
import math
import sys
from pathlib import Path
from PIL import Image, ImageOps

P = Path(__file__).resolve().parent.parent / 'assets' / 'animal_parts'

# деталь: файл, левый-верхний угол в риге, шарнир в риге, отразить
RIGS = {
    'sheep': {
        'root': (215, 330),
        'body': ('sheep_body_side.png', (95, 52), (215, 150), False),
        'head': ('sheep_head_side.png', (0, 0), (150, 150), False),
        'leg': ('sheep_leg_side.png', None, None, False),
        'hips': [(268, 198), (178, 198), (292, 205), (150, 205)],   # дальняя задняя, дальняя передняя, ближняя задняя, ближняя передняя
        'leg_top': (31, 12),
    },
    'goat': {
        'root': (215, 340),
        'body': ('goat_body_side.png', (98, 70), (215, 160), False),
        'head': ('goat_head_side.png', (0, -10), (160, 150), False),   # файл уже отражён
        'leg': ('goat_leg_side.png', None, None, False),
        'hips': [(270, 212), (175, 212), (296, 218), (150, 218)],
        'leg_top': (31, 12),
    },
}
OX, OY = 30, 60
_c = {}


def img(f, flip=False, shade=0):
    k = (f, flip, shade)
    if k not in _c:
        im = Image.open(P / f).convert('RGBA')
        if flip:
            im = ImageOps.mirror(im)
        if shade:
            r, g, b, a = im.split()
            im = Image.merge('RGBA', [c.point(lambda v: int(v * (1 - shade))) for c in (r, g, b)] + [a])
        _c[k] = im
    return _c[k]


def put(canvas, im, tl, piv, ang=0, dx=0, dy=0):
    px, py = piv[0] - tl[0], piv[1] - tl[1]
    W = int(max(im.width, im.height) * 2.4)
    big = Image.new('RGBA', (W, W))
    big.alpha_composite(im, (int(W / 2 - px), int(W / 2 - py)))
    if ang:
        big = big.rotate(-ang, resample=Image.BICUBIC, center=(W / 2, W / 2))
    canvas.alpha_composite(big, (int(OX + piv[0] + dx - W / 2), int(OY + piv[1] + dy - W / 2)))


def frame(R, t, mode):
    c = Image.new('RGBA', (420, 440), (150, 200, 120, 255))
    s = math.sin(t * 2 * math.pi)
    legs = [0, 0, 0, 0]; bob = 0; head = 0
    if mode == 'walk':
        a = 20
        legs = [a * s, -a * s, -a * s, a * s]     # диагональная пара шагает вместе
        bob = -abs(math.cos(t * 2 * math.pi)) * 5
        head = math.sin(t * 4 * math.pi) * 2
    else:
        head = -34 * max(0, math.sin(t * 2 * math.pi))   # наклон к траве
    lf = R['leg'][0]
    lt = R['leg_top']
    for i, hip in enumerate(R['hips']):
        im = img(lf, shade=0.14 if i < 2 else 0)
        put(c, im, (hip[0] - lt[0], hip[1] - lt[1]), hip, legs[i], 0, bob * 0.3)
    bf, btl, bpiv, bfl = R['body']
    put(c, img(bf, bfl), btl, bpiv, 0, 0, bob)
    hf, htl, hpiv, hfl = R['head']
    put(c, img(hf, hfl), htl, hpiv, head, 0, bob)
    return c


if __name__ == '__main__':
    kind, out = sys.argv[1], sys.argv[2]
    R = RIGS[kind]
    fr = [frame(R, i / 6, 'walk') for i in range(6)] + [frame(R, i / 4, 'graze') for i in range(2)]
    sheet = Image.new('RGBA', (420 * len(fr), 440))
    for i, f in enumerate(fr):
        sheet.alpha_composite(f, (420 * i, 0))
    sheet.convert('RGB').resize((sheet.width // 2, sheet.height // 2)).save(out)
