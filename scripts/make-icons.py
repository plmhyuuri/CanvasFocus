#!/usr/bin/env python3
"""Generate CanvasFocus toolbar/store icons.

Run from the project root:  python3 scripts/make-icons.py

Outputs icons/icon{16,32,48,128}.png. Re-run only if you change the design below;
the generated PNGs are committed so a build step is never required to load the
extension (the whole point of the no-build constraint).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Design tokens (echo src/content/panel.css.js).
BG = (26, 26, 26, 255)        # --cf-bg-card
ACCENT = (37, 95, 191, 255)   # --cf-accent
FG = (255, 255, 255, 255)

SIZES = (16, 32, 48, 128)
OUT_DIR = Path(__file__).resolve().parent.parent / "icons"

FONT_CANDIDATES = (
    "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
)


def load_font(size: int):
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def rounded_bg(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = max(2, round(size * 0.22))
    draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=radius, fill=BG)
    return img


def draw_glyph(img: Image.Image, size: int) -> None:
    draw = ImageDraw.Draw(img)
    # Accent "focus" ring behind the letters, then "CF" in white.
    ring_pad = round(size * 0.16)
    draw.ellipse(
        [(ring_pad, ring_pad), (size - ring_pad, size - ring_pad)],
        outline=ACCENT,
        width=max(1, round(size * 0.08)),
    )
    font = load_font(max(6, round(size * 0.42)))
    text = "CF"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1]),
        text,
        font=font,
        fill=FG,
    )


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        img = rounded_bg(size)
        draw_glyph(img, size)
        path = OUT_DIR / f"icon{size}.png"
        img.save(path)
        print(f"wrote {path.relative_to(OUT_DIR.parent)}")


if __name__ == "__main__":
    main()
