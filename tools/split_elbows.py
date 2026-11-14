"""Режет руки «спереди» и «сзади» по локтю — чтобы руки сгибались, когда героиня держит вилы.
arm_{view}_{side}.png → arm_{view}_{side}_up.png (плечо до локтя) и _lo.png (предплечье с кистью;
сверху запас на радиус «шапки» локтя — её дорисовывает js/rig.js, cappedImage).
Печатает числа для js/rig.js. Запуск: python tools/split_elbows.py
"""
from pathlib import Path
import numpy as np
from PIL import Image

RIG = Path(__file__).resolve().parent.parent / 'assets' / 'girl' / 'rig'
EY = 56          # строка локтя (одинакова у всех четырёх рук)
for name in ('arm_front_l', 'arm_front_r', 'arm_back_l', 'arm_back_r'):
    im = Image.open(RIG / f'{name}.png').convert('RGBA')
    a = np.array(im)[:, :, 3] > 0
    xs = np.where(a[EY])[0]
    ex, r = (xs.min() + xs.max()) / 2, (xs.max() - xs.min()) / 2
    top = int(EY - r - 1)
    im.crop((0, 0, im.width, EY + 3)).save(RIG / f'{name}_up.png')
    im.crop((0, top, im.width, im.height)).save(RIG / f'{name}_lo.png')
    print(f"{name}: локоть ({ex:.1f}, {EY}), радиус {r:.1f}, предплечье с y={top}")
