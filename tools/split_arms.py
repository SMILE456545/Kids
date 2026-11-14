"""Отделяет руки от цельного верха героини (вид спереди и сзади), чтобы руки качались при ходьбе.
Граница руки — край комбинезона (ломаная x(y) для каждой стороны). Плечо (выше KEEP_Y) остаётся
и на туловище — когда рука качается, под ней видно то же плечо, а не дырку.
Результат: assets/girl/rig/body_{front,back}_na.png (без рук ниже плеча) и arm_{front,back}_{l,r}.png.
Печатает tl (левый верх кусочка) для js/rig.js.
Запуск: python tools/split_arms.py
"""
from pathlib import Path
import numpy as np
from PIL import Image

RIG = Path(__file__).resolve().parent.parent / 'assets' / 'girl' / 'rig'

# граница рука/комбинезон: (y, x); левая рука — пиксели левее линии, правая — правее
SIDES = {
    'front': {
        'l': [(195, 80), (220, 78), (240, 75), (262, 70), (290, 63), (300, 60), (350, 57)],
        'r': [(195, 163), (220, 164), (240, 167), (262, 173), (290, 180), (300, 182), (350, 185)],
        'top': 203, 'keep': 245, 'hair': (225, 59, 185),   # до y=225 волосы: левая рука только x>59, правая x<185
    },
    'back': {
        'l': [(190, 80), (222, 82), (240, 75), (262, 69), (285, 64), (300, 63), (350, 60)],
        'r': [(190, 151), (222, 151), (240, 158), (262, 163), (285, 170), (300, 173), (350, 176)],
        'top': 200, 'keep': 245, 'hair': (220, 60, 173),
    },
}


def line_x(pts, ys):
    py = [p[0] for p in pts]; px = [p[1] for p in pts]
    return np.interp(ys, py, px)


for view, cfg in SIDES.items():
    im = Image.open(RIG / f'upper_{view}.png').convert('RGBA')
    a = np.array(im)
    h, w = a.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w]
    solid = a[:, :, 3] > 0
    below = ys >= cfg['top']
    hy, hl, hr = cfg['hair']
    xl = line_x(cfg['l'], ys[:, 0])[:, None] - 1.5    # линия комбинезона остаётся на туловище
    xr = line_x(cfg['r'], ys[:, 0])[:, None] + 1.5
    arm_l = solid & below & (xs < xl) & ~((ys < hy) & (xs <= hl))
    arm_r = solid & below & (xs > xr) & ~((ys < hy) & (xs >= hr))
    body = a.copy()
    cut = (arm_l | arm_r) & (ys >= cfg['keep'])
    body[cut, 3] = 0
    Image.fromarray(body).save(RIG / f'body_{view}_na.png')
    for side, m in (('l', arm_l), ('r', arm_r)):
        part = np.zeros_like(a); part[m] = a[m]
        img = Image.fromarray(part)
        bb = img.getbbox()
        img.crop(bb).save(RIG / f'arm_{view}_{side}.png')
        print(view, side, 'tl', bb[:2], 'size', (bb[2] - bb[0], bb[3] - bb[1]))


# В картинках ног сверху попали кончики пальцев (раньше их закрывала неподвижная рука).
# Убираем всё, что в верхних строках выходит за ширину штанины (её берём чуть ниже пальцев).
# Оригиналы — в images/rig_backup/.
BACKUP = RIG.parent.parent.parent / 'images' / 'rig_backup'
for name in ('leg_front_l', 'leg_front_r', 'leg_back_l', 'leg_back_r'):
    src = BACKUP / f'{name}.png'
    a = np.array(Image.open(src if src.exists() else RIG / f'{name}.png').convert('RGBA'))
    ref = 30                                           # строка, где пальцев уже нет
    cols = np.where(a[ref, :, 3] > 0)[0]
    x0, x1 = cols.min() - 2, cols.max() + 2
    top = a[:ref]
    mask = np.zeros(top.shape[:2], bool); mask[:, :max(0, x0)] = True; mask[:, x1 + 1:] = True
    top[mask, 3] = 0
    Image.fromarray(a).save(RIG / f'{name}.png')
    print(name, 'штанина x', x0, x1)
