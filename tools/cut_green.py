"""Вырезает деревья и кусты с гладкого цветного (зелёного) фона.
Фон — гладкий (малая локальная вариация) и связан с краями картинки; у объектов есть фактура и тёмный контур.
Запуск: python tools/cut_green.py <лист> <папка> имя1 имя2 ...   (имена — по порядку: строки сверху вниз, слева направо)
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cut_sprites import components, attach_small, order  # noqa: E402


def smooth_bg(rgb):
    g = np.array(Image.fromarray(rgb).convert('L')).astype(np.float32)
    # локальная вариация: |яркость - размытая яркость|, затем максимум по окрестности
    blur = np.array(Image.fromarray(g.astype(np.uint8)).filter(ImageFilter.BoxBlur(3))).astype(np.float32)
    var = np.abs(g - blur)
    var = np.array(Image.fromarray(np.clip(var * 8, 0, 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))).astype(np.float32) / 8
    a = rgb.astype(np.int16)
    r, gg, b = a[..., 0], a[..., 1], a[..., 2]
    greenish = (gg >= r - 10) & (gg > b + 15)
    cand = (var < 4.0) & greenish & (g > 60)
    # заливка от краёв по кандидатам
    reached = np.zeros_like(cand)
    reached[0, :] = cand[0, :]; reached[-1, :] = cand[-1, :]
    reached[:, 0] = cand[:, 0]; reached[:, -1] = cand[:, -1]
    while True:
        g2 = reached.copy()
        for _ in range(8):
            h = g2.copy()
            h[1:, :] |= g2[:-1, :]; h[:-1, :] |= g2[1:, :]
            h[:, 1:] |= g2[:, :-1]; h[:, :-1] |= g2[:, 1:]
            g2 = h & cand
        if (g2 == reached).all():
            break
        reached = g2
    return reached


def main(src, outdir, names):
    img = Image.open(src).convert('RGB')
    rgb = np.array(img)
    # белый/серый фон — заливка светлых пикселей от краёв; цветной гладкий — по гладкости
    corners = np.concatenate([rgb[:20, :20].reshape(-1, 3), rgb[-20:, -20:].reshape(-1, 3)]).astype(int)
    light = (corners.min(1) > 225).mean() > 0.8
    if light:
        from cut_sprites import bg_mask
        bg = bg_mask(rgb)
    else:
        bg = smooth_bg(rgb)
    fg = ~bg
    if light:
        # белый фон, зажатый между ветками (заливка от краёв туда не дошла)
        a = rgb.astype(int)
        fg &= ~((a.min(2) > 232) & (a.max(2) - a.min(2) < 18))
    # закрываем мелкие дырочки внутри объектов и чуть подрезаем ореол
    m = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(5))
    fg = np.array(m) > 0
    alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = img.copy(); rgba.putalpha(alpha)
    # для поиска объектов маску сжимаем, чтобы соседи с узкой щелью не слиплись
    core = np.array(Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(15))) > 0
    boxes = order(attach_small(components(core, scale=4, min_area=4000), frac=0.1, reach=30))
    boxes = [[max(0, b[0] - 10), max(0, b[1] - 10), b[2] + 10, b[3] + 10] + b[4:] for b in boxes]
    print('найдено', len(boxes), 'объектов, имён', len(names))
    Path(outdir).mkdir(parents=True, exist_ok=True)
    for b, name in zip(boxes, names):
        x0, y0, x1, y1 = b[:4]
        crop = rgba.crop((x0, y0, x1, y1))
        bb = crop.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
        crop = crop.crop(bb)
        crop.save(Path(outdir) / f'{name}.png')
        print('  ', name, crop.size)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
