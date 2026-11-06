"""Готовит части для перекладки (cut-out) героини в assets/girl/rig/.
- torso_side.png: туловище в профиль из assets/girl/side.png, нарисованная рука стёрта
  (закрашена комбинезоном по соседним пикселям), чтобы её заменила качающаяся рука-часть.
- upper_front/back.png и leg_front_l/r, leg_back_l/r.png: верх и ноги из фигур спереди/сзади.
Запуск: python tools/build_rig.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
RIG = ROOT / 'assets' / 'girl' / 'rig'


def _box(a, r, axis):
    n = a.shape[axis]
    pad = [(0, 0)] * a.ndim; pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis)
    return (np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, np.arange(0, n), axis=axis)) / (2 * r + 1)


def blur(a, r):
    a = a.astype(np.float32)
    k = max(1, int(round(r * 0.6)))
    for _ in range(3):
        a = _box(_box(a, k, 0), k, 1)
    return a


def torso_side():
    im = Image.open(ROOT / 'assets' / 'girl' / 'side.png').convert('RGBA')
    a = np.array(im).astype(np.float32)
    # контур нарисованной руки (рукав + кисть), координаты side.png
    arm = Image.new('L', im.size, 0)
    ImageDraw.Draw(arm).polygon([(84, 268), (150, 268), (155, 330), (153, 405), (150, 452),
                                 (96, 454), (90, 405), (80, 400), (79, 330), (80, 280)], fill=255)
    hole = np.array(arm.filter(ImageFilter.MaxFilter(3))) > 0
    # известные пиксели: непрозрачные и вне руки
    known = ((a[..., 3] > 200) & ~hole).astype(np.float32)
    out = a.copy()
    for c in range(3):
        acc = np.full(hole.shape, np.nan, np.float32)
        for r, need in ((6, 0.12), (14, 0.03), (30, 0.005)):
            den = blur(known, r)
            est = blur(a[..., c] * known, r) / np.maximum(den, 1e-6)
            acc = np.where(np.isnan(acc) & (den > need), est, acc)
        out[..., c] = np.where(hole, np.nan_to_num(acc, nan=a[..., c]), a[..., c])
    # внутри силуэта туловища оставляем непрозрачность; лёгкая фактура ткани
    rng = np.random.default_rng(1)
    noise = rng.normal(0, 3.0, hole.shape).astype(np.float32)
    for c in range(3):
        out[..., c] = np.where(hole, out[..., c] + noise, out[..., c])
    # левая граница туловища (спина) под рукой — тёмный контур
    res = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')
    d = ImageDraw.Draw(res)
    d.line([(76, 300), (72, 340), (68, 380), (66, 420), (68, 452)], fill=(70, 52, 46, 255), width=0)
    # обрезаем: от шеи до низа комбинезона (ноги будут отдельными частями)
    # обрывки хвостика и подбородка сверху — их нарисует голова-часть
    al = np.array(res.getchannel('A'))
    al[:282, :80] = 0
    al[:236, :] = 0
    # низ комбинезона — дугой (а не ровным срезом), под ней скрываются шапки суставов бёдер
    def cut_y(x):
        return 478 - 24 * ((x - 122) / 70.0) ** 2
    H, Wd = al.shape
    for x in range(Wd):
        al[int(round(cut_y(x))):, x] = 0
    res.putalpha(Image.fromarray(al))
    d = ImageDraw.Draw(res)
    pts = [(x, cut_y(x)) for x in range(Wd) if al[max(0, int(cut_y(x)) - 3), x] > 128]
    if pts:
        d.line(pts, fill=(62, 44, 38, 255), width=3, joint='curve')
    res = res.crop((0, 226, im.width, 480))
    res.save(RIG / 'torso_side.png')
    print('torso_side', res.size)


def split_front_back():
    for side in ('front', 'back'):
        im = Image.open(RIG / f'body_{side}.png').convert('RGBA')
        im.crop((0, 0, im.width, 350)).save(RIG / f'upper_{side}.png')
        im.crop((28, 318, 122, im.height)).save(RIG / f'leg_{side}_l.png')
        im.crop((118, 318, 208, im.height)).save(RIG / f'leg_{side}_r.png')
        print(side, im.size)


if __name__ == '__main__':
    torso_side()
    split_front_back()
