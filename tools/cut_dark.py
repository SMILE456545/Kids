"""Вырезает части персонажа с тёмного однотонного фона (скриншоты с тёмной подложкой).
Фон = пиксели, близкие к цвету угла и связанные с краями картинки. Объекты делятся по связности.
Запуск: python tools/cut_dark.py <картинка> <папка> имя1 [имя2 ...]   (порядок: сверху вниз, слева направо)
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cut_sprites import components, attach_small, order  # noqa: E402


def dark_bg(rgb, tol=16):
    a = rgb.astype(np.int16)
    ref = np.median(np.concatenate([a[:4].reshape(-1, 3), a[-4:].reshape(-1, 3), a[:, :4].reshape(-1, 3), a[:, -4:].reshape(-1, 3)]), 0)
    cand = (np.abs(a - ref).max(2) < tol)
    reached = np.zeros_like(cand)
    reached[0, :] = cand[0, :]; reached[-1, :] = cand[-1, :]
    reached[:, 0] = cand[:, 0]; reached[:, -1] = cand[:, -1]
    while True:
        g = reached.copy()
        for _ in range(8):
            h = g.copy()
            h[1:, :] |= g[:-1, :]; h[:-1, :] |= g[1:, :]
            h[:, 1:] |= g[:, :-1]; h[:, :-1] |= g[:, 1:]
            g = h & cand
        if (g == reached).all():
            return reached
        reached = g


def main(src, outdir, names):
    img = Image.open(src).convert('RGB')
    rgb = np.array(img)
    fg = ~dark_bg(rgb)
    m = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))
    fg = np.array(m) > 0
    alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    rgba = img.copy(); rgba.putalpha(alpha)
    core = np.array(Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(7))) > 0
    boxes = order(attach_small(components(core, scale=2, min_area=300), frac=0.08, reach=20))
    print(Path(src).name, 'объектов:', len(boxes))
    Path(outdir).mkdir(parents=True, exist_ok=True)
    for b, name in zip(boxes, names):
        x0, y0, x1, y1 = max(0, b[0] - 6), max(0, b[1] - 6), b[2] + 6, b[3] + 6
        crop = rgba.crop((x0, y0, x1, y1))
        crop = crop.crop(crop.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
        crop.save(Path(outdir) / f'{name}.png')
        print('  ', name, crop.size)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
