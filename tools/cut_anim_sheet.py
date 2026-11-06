"""Режет лист с кадрами анимации животных (тёмный фон, розовые подписи) на кадры.
Каждый кадр сохраняется в одном масштабе с листа; точка опоры (центр тела, низ ног) пишется в anchors.json,
чтобы при смене кадров животное не дёргалось.
Запуск: python tools/cut_anim_sheet.py <лист> <папка> <схема.json>
Схема: [{"name": "sheep_walk_side", "box": [x0, y0, x1, y1], "count": 5}, ...] — объекты в box слева направо.
"""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cut_sprites import components  # noqa: E402
from cut_dark import dark_bg  # noqa: E402


def main(src, outdir, scheme_path):
    img = Image.open(src).convert('RGB')
    rgb = np.array(img)
    a = rgb.astype(int)
    fg = ~dark_bg(rgb, tol=20)
    # фон, зажатый между ногами (заливка от краёв туда не дошла): серый, как угол листа
    ref = np.median(a[:6, :6].reshape(-1, 3), 0)
    fg &= ~(np.abs(a - ref).max(2) < 13)
    # розовые плашки-подписи (пурпурнее ушей: синий выше зелёного) — в фон
    label = (a[..., 0] > 200) & (a[..., 2] > a[..., 1] + 8) & (a[..., 1] < 200)
    lab_mask = np.array(Image.fromarray((label * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
    fg &= ~lab_mask
    fg = np.array(Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 0
    alpha = Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    rgba = img.copy(); rgba.putalpha(alpha)
    out = Path(outdir); out.mkdir(parents=True, exist_ok=True)
    anchors = {}
    for item in json.loads(Path(scheme_path).read_text(encoding='utf-8-sig')):
        x0, y0, x1, y1 = item['box']
        sub = fg[y0:y1, x0:x1]
        core = np.array(Image.fromarray((sub * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5))) > 0
        comps = sorted([b for b in components(core, scale=2, min_area=1500)], key=lambda b: b[4], reverse=True)[:item['count']]
        comps.sort(key=lambda b: b[0])
        if len(comps) != item['count']:
            print('!!', item['name'], 'нашлось', len(comps), 'из', item['count'])
        lab, sc, _ = components.last
        for i, b in enumerate(comps):
            # маска только этого объекта (соседние кадры не попадают)
            m = np.array(Image.fromarray(((lab == b[5]) * 255).astype(np.uint8)).resize((x1 - x0, y1 - y0), Image.NEAREST)
                         .filter(ImageFilter.MaxFilter(9))) > 0
            m &= sub
            ys, xs = np.nonzero(m)
            bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
            crop = rgba.crop((x0 + bx0, y0 + by0, x0 + bx1, y0 + by1))
            al = np.array(crop.getchannel('A')); al[~m[by0:by1, bx0:bx1]] = 0; crop.putalpha(Image.fromarray(al))
            name = item['name'] if item['count'] == 1 else f"{item['name']}_{i}"
            if item.get('names'):
                name = item['names'][i]
            crop.save(out / f'{name}.png')
            # опора: центр масс тела (верхние 75%) по x, низ ног по y
            h = by1 - by0
            body = m[by0:by0 + int(h * 0.75), bx0:bx1]
            cx = float(np.nonzero(body)[1].mean()) if body.any() else (bx1 - bx0) / 2
            anchors[name] = [round(float(cx), 1), int(h)]
            print('  ', name, crop.size)
    ap = out / 'anchors.json'
    old = json.loads(ap.read_text(encoding='utf-8')) if ap.exists() else {}
    old.update(anchors)
    ap.write_text(json.dumps(old, ensure_ascii=False, indent=1), encoding='utf-8')
    # то же самое для игры (браузер не читает json с диска при открытии файла двойным щелчком)
    (out / 'anchors.js').write_text('/* создано tools/cut_anim_sheet.py: [центр тела x, высота кадра] */\nconst ANIM_ANCHORS = '
                                    + json.dumps(old, ensure_ascii=False) + ';\n', encoding='utf-8')


if __name__ == '__main__':
    main(*sys.argv[1:4])
