"""Убирает светлый фон с одной картинки (заливка от краёв) и обрезает по содержимому.
Запуск: python tools/cut_one.py <вход> <выход.png>
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cut_sprites import bg_mask  # noqa: E402


def main(src, dst):
    img = Image.open(src).convert('RGB')
    fg = ~bg_mask(np.array(img))
    alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    out = img.copy(); out.putalpha(alpha)
    out = out.crop(alpha.point(lambda v: 255 if v > 8 else 0).getbbox())
    out.save(dst)
    print(dst, out.size)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
