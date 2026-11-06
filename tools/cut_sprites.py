"""Вырезает фигуры из листов в images/ в отдельные PNG с прозрачным фоном (assets/raw/).
Фон убирается заливкой от краёв: светлые малонасыщенные пиксели, связанные с краем картинки.
Запуск: python tools/cut_sprites.py
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'images'
OUT = ROOT / 'assets' / 'raw'
OUT.mkdir(parents=True, exist_ok=True)


def bg_mask(rgb):
    a = rgb.astype(np.int16)
    mx, mn = a.max(2), a.min(2)
    cand = (mx - mn < 24) & (mx > 172)
    # заливка от краёв: геодезическое наращивание по кандидатам (с ускорением на уменьшенной копии)
    reached = np.zeros_like(cand)
    reached[0, :] = cand[0, :]; reached[-1, :] = cand[-1, :]
    reached[:, 0] = cand[:, 0]; reached[:, -1] = cand[:, -1]
    for _ in range(4000):
        g = reached.copy()
        g[1:, :] |= reached[:-1, :]; g[:-1, :] |= reached[1:, :]
        g[:, 1:] |= reached[:, :-1]; g[:, :-1] |= reached[:, 1:]
        g &= cand
        # несколько шагов подряд за итерацию
        for _k in range(6):
            h = g.copy()
            h[1:, :] |= g[:-1, :]; h[:-1, :] |= g[1:, :]
            h[:, 1:] |= g[:, :-1]; h[:, :-1] |= g[:, 1:]
            g = h & cand
        if (g == reached).all():
            break
        reached = g
    return reached


def components(fg, scale=4, min_area=900):
    h, w = fg.shape
    small = Image.fromarray((fg * 255).astype(np.uint8)).resize((w // scale, h // scale), Image.BOX)
    small = small.filter(ImageFilter.MaxFilter(3))
    m = np.array(small) > 40
    lab = np.zeros(m.shape, np.int32)
    boxes = []
    sh, sw = m.shape
    n = 0
    for y in range(sh):
        for x in range(sw):
            if m[y, x] and not lab[y, x]:
                n += 1
                stack = [(y, x)]; lab[y, x] = n
                x0 = x1 = x; y0 = y1 = y; area = 0
                while stack:
                    cy, cx = stack.pop(); area += 1
                    x0 = min(x0, cx); x1 = max(x1, cx); y0 = min(y0, cy); y1 = max(y1, cy)
                    for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                        if 0 <= ny < sh and 0 <= nx < sw and m[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n; stack.append((ny, nx))
                if area * scale * scale >= min_area:
                    boxes.append([x0 * scale, y0 * scale, (x1 + 1) * scale, (y1 + 1) * scale, area, n])
    components.last = (lab, scale, (h, w))
    return boxes


def merge_close(boxes, gap):
    changed = True
    while changed:
        changed = False
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b = boxes[i], boxes[j]
                if a[0] - gap < b[2] and b[0] - gap < a[2] and a[1] - gap < b[3] and b[1] - gap < a[3]:
                    boxes[i] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]), a[4] + b[4]]
                    boxes.pop(j); changed = True; break
            if changed:
                break
    return boxes


def attach_small(boxes, frac=0.12, reach=40):
    if not boxes:
        return boxes
    big_area = max(b[4] for b in boxes)
    big = [b for b in boxes if b[4] >= big_area * frac]
    for s in [b for b in boxes if b[4] < big_area * frac]:
        cx, cy = (s[0] + s[2]) / 2, (s[1] + s[3]) / 2
        best, bd = None, 1e9
        for b in big:
            dx = max(b[0] - cx, 0, cx - b[2]); dy = max(b[1] - cy, 0, cy - b[3])
            d = (dx * dx + dy * dy) ** 0.5
            if d < bd:
                best, bd = b, d
        if best is not None and bd < reach:
            best[0] = min(best[0], s[0]); best[1] = min(best[1], s[1]); best[2] = max(best[2], s[2]); best[3] = max(best[3], s[3])
    return big


def order(boxes):
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows, cur = [], []
    for b in boxes:
        if cur and (b[1] + b[3]) / 2 - (cur[0][1] + cur[0][3]) / 2 > (cur[0][3] - cur[0][1]) * 0.6:
            rows.append(cur); cur = []
        cur.append(b)
    if cur:
        rows.append(cur)
    out = []
    for r in rows:
        out += sorted(r, key=lambda b: b[0])
    return out


def process(path, gap):
    img = Image.open(path).convert('RGB')
    rgb = np.array(img)
    bg = bg_mask(rgb)
    fg = ~bg
    alpha = Image.fromarray((fg * 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    rgba = img.copy(); rgba.putalpha(alpha)
    boxes = order(attach_small(components(fg)))
    stem = path.stem.replace("'", '').replace(' ', '_')
    res = []
    for i, (x0, y0, x1, y1, _a) in enumerate(boxes):
        pad = 4
        crop = rgba.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))
        bb = crop.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        if bb:
            crop = crop.crop(bb)
        name = f'{stem}_{i:02d}.png'
        crop.save(OUT / name)
        res.append((name, crop))
    return res


def sheet(items, path):
    W, cell = 8, 170
    rows = (len(items) + W - 1) // W
    sh = Image.new('RGB', (W * cell, rows * (cell + 18)), (90, 140, 90))
    d = ImageDraw.Draw(sh)
    for k, (name, im) in enumerate(items):
        t = im.copy(); t.thumbnail((cell - 10, cell - 10))
        x, y = (k % W) * cell, (k // W) * (cell + 18)
        sh.paste(t, (x + 5, y + 5), t)
        d.text((x + 4, y + cell + 2), name, fill=(255, 255, 255))
    sh.save(path)


ASSETS = ROOT / 'assets'

ANIMAL_GRID = [  # (строка панели, левая/правая) -> (вид, имена вариантов)
    [('horse', ['chestnut', 'black', 'grey', 'palomino']), ('cow', ['holstein', 'brownspot', 'brown', 'black'])],
    [('sheep', ['white', 'cream', 'grey', 'brown']), ('goat', ['white', 'brown', 'grey', 'black'])],
    [('pig', ['pink', 'spotted', 'brown', 'muddy']), ('pig', ['pink2', 'spotted2', 'brown2', 'tan'])],
    [('rabbit', ['white', 'grey', 'brown', 'dutch']), ('chicken', ['white', 'brown', 'black', 'buff'])],
]
ITEMS = ['brush', 'sponge', 'bucket_water', 'bucket_carrots', 'hay_bale', 'straw', 'pitchfork', 'shovel',
         'wheelbarrow', 'grain_bag', 'egg_basket', 'watering_can', 'poop']
GIRL = {
    'model girl\'': ['front', 'three_quarter', 'side', 'back'],
    'moving girl': ['walk_front', 'walk_a', 'walk_side', 'walk_b'],
    'girl with emotins': ['emo_smile', 'emo_talk', 'emo_surprised', 'emo_laugh'],
    'girl with items': ['pose_wave', 'pose_pitchfork', 'pose_bucket', 'pose_point'],
}


def runs(flags):
    out, start = [], None
    for i, v in enumerate(flags):
        if v and start is None:
            start = i
        if not v and start is not None:
            out.append((start, i)); start = None
    if start is not None:
        out.append((start, len(flags)))
    return [r for r in out if r[1] - r[0] > 40]


def load(path):
    img = Image.open(path).convert('RGB')
    rgb = np.array(img)
    fg = ~bg_mask(rgb)
    alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    rgba = img.copy(); rgba.putalpha(alpha)
    return rgb, fg, rgba


def split_save(fg, rgba, x0, x1, y0, y1, names, prefix=''):
    n = len(names)
    prof = fg[y0:y1, x0:x1].sum(0)
    cuts = [x0]
    win = int((x1 - x0) / (n * 3))
    for k in range(1, n):
        t = int((x1 - x0) * k / n)
        a, b = max(0, t - win), min(len(prof), t + win)
        cuts.append(x0 + a + int(np.argmin(prof[a:b])))
    cuts.append(x1)
    for k, name in enumerate(names):
        ca, cb = cuts[k], cuts[k + 1]
        sub = fg[y0:y1, ca:cb].copy()
        comps = components(sub, scale=2, min_area=40)
        if not comps:
            continue
        main = max(comps, key=lambda b: b[4])
        keep = [b for b in comps if b is main or b[4] > main[4] * 0.12]
        # стираем всё, что не относится к главной фигуре
        lab, sc, (hh, ww) = components.last
        ids = np.isin(lab, [b[5] for b in keep])
        m = np.array(Image.fromarray((ids * 255).astype(np.uint8)).resize((ww, hh), Image.NEAREST)
                     .filter(ImageFilter.MaxFilter(5))) > 0
        bx0, by0 = min(b[0] for b in keep), min(b[1] for b in keep)
        bx1, by1 = max(b[2] for b in keep), max(b[3] for b in keep)
        box = (ca + bx0, y0 + by0, ca + bx1, y0 + by1)
        crop = rgba.crop(box)
        a = np.array(crop.getchannel('A'))
        a[~m[by0:by1, bx0:bx1]] = 0
        crop.putalpha(Image.fromarray(a))
        bb = crop.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        crop = crop.crop(bb)
        crop.save(ASSETS / f'{prefix}{name}.png')
        print('  ', f'{prefix}{name}.png', crop.size)
        continue
        crop = rgba.crop(box)
        crop.save(ASSETS / f'{prefix}{name}.png')
        print('  ', f'{prefix}{name}.png', crop.size)


def panels(rgb):
    white = rgb.min(2) > 242
    cols = runs(white.mean(0) < 0.97)
    rows = runs(white.mean(1) < 0.97)
    return cols, rows


if __name__ == '__main__':
    (ASSETS / 'animals').mkdir(parents=True, exist_ok=True)
    (ASSETS / 'girl').mkdir(parents=True, exist_ok=True)
    (ASSETS / 'items').mkdir(parents=True, exist_ok=True)
    for fname, suffix in (('animals.jpg', ''), ('dirty animals.jpg', '_dirty')):
        rgb, fg, rgba = load(SRC / fname)
        cols, rows = panels(rgb)
        print(fname, 'panels', cols, rows)
        for r, (y0, y1) in enumerate(rows):
            for c, (x0, x1) in enumerate(cols):
                kind, names = ANIMAL_GRID[r][c]
                split_save(fg, rgba, x0, x1, y0, y1, [f'{kind}_{v}{suffix}' for v in names], 'animals/')
    rgb, fg, rgba = load(SRC / 'items.jpg')
    boxes = order(attach_small(components(fg)))
    for (x0, y0, x1, y1, *_r), name in zip(boxes, ITEMS):
        rgba.crop((x0, y0, x1, y1)).crop(rgba.crop((x0, y0, x1, y1)).getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()).save(ASSETS / 'items' / f'{name}.png')
    print('items', len(boxes))
    for hero in ('girl', 'boy'):
        (ASSETS / hero).mkdir(parents=True, exist_ok=True)
        for stem, names in GIRL.items():
            stem = stem.replace('girl', hero)
            src = next((p for p in SRC.glob('*') if p.stem.replace("'", '').strip().lower() == stem.replace("'", '').lower()
                        and p.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp')), None)
            if not src:
                print('нет файла:', stem)
                continue
            rgb, fg, rgba = load(src)
            cols = np.nonzero(fg.sum(0) > 0)[0]
            split_save(fg, rgba, int(cols.min()), int(cols.max()) + 1, 0, fg.shape[0], names, f'{hero}/')