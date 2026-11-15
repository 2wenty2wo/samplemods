#!/usr/bin/env python3
"""Generate static/og-default.png (1200×630) in the Sample Mods hardware look."""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "static" / "og-default.png"

W, H = 1200, 630

# Chassis / screen palette (mirrors src/app.css)
BODY = (208, 204, 201)  # --mpc-body-mid
BEZEL = (12, 12, 12)
SCREEN = (8, 9, 12)
WORDMARK = (230, 36, 60)  # --mpc-wordmark-red
YELLOW = (232, 200, 17)
CYAN = (56, 182, 232)
PAD = (84, 87, 96)
PAD_LIT = (255, 138, 30)
LED = (46, 230, 90)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        if path and os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_pad_grid(draw: ImageDraw.ImageDraw, x0: int, y0: int) -> None:
    size, gap = 42, 10
    for row in range(2):
        for col in range(4):
            x = x0 + col * (size + gap)
            y = y0 + row * (size + gap)
            draw.rounded_rectangle((x, y, x + size, y + size), radius=6, fill=PAD)
            # corner LED
            draw.ellipse((x + 6, y + 6, x + 14, y + 14), fill=LED if (row + col) % 3 == 0 else (40, 42, 48))


def main() -> None:
    img = Image.new("RGB", (W, H), BODY)
    draw = ImageDraw.Draw(img)

    # Outer chassis bevel
    draw.rounded_rectangle((28, 28, W - 28, H - 28), radius=28, fill=(230, 227, 223))
    draw.rounded_rectangle((42, 42, W - 42, H - 42), radius=22, fill=BODY)

    # Black bezel / screen panel
    panel = (70, 70, W - 70, 420)
    draw.rounded_rectangle(panel, radius=16, fill=BEZEL)
    screen = (92, 92, W - 92, 398)
    draw.rounded_rectangle(screen, radius=10, fill=SCREEN)

    # Scanline hint
    for y in range(screen[1] + 8, screen[3] - 8, 4):
        draw.line((screen[0] + 10, y, screen[2] - 10, y), fill=(14, 16, 22))

    # Status LED
    draw.ellipse((118, 118, 138, 138), fill=LED)
    draw.ellipse((122, 122, 134, 134), fill=(180, 255, 200))

    word_font = font(64, bold=True)
    tag_font = font(28, bold=False)
    kick_font = font(18, bold=True)

    draw.text((160, 112), "SAMPLE MODS", font=word_font, fill=WORDMARK)
    draw.text((160, 200), "Mods, apps, games & tools for the Akai MPC Sample", font=tag_font, fill=YELLOW)
    draw.text((160, 250), "COMMUNITY CATALOG", font=kick_font, fill=CYAN)

    # Accent strip
    draw.rectangle((160, 290, 420, 296), fill=PAD_LIT)

    # Pad hint on the chassis below the screen
    draw_pad_grid(draw, 160, 460)
    draw_pad_grid(draw, 420, 460)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, format="PNG", optimize=True)
    size_kb = OUT.stat().st_size / 1024
    print(f"Wrote {OUT} ({size_kb:.1f} KB)")
    if size_kb > 200:
        raise SystemExit(f"og-default.png is {size_kb:.1f} KB; keep under 200 KB")


if __name__ == "__main__":
    main()
