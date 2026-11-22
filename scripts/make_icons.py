"""Rasterize the WordPack Pro gem for PWA and maskable icons."""
from math import hypot
from pathlib import Path

from PIL import Image, ImageDraw

PUBLIC = Path(__file__).resolve().parents[1] / "public"
SIZE = 1024


def icon(maskable):
    background = Image.new("RGB", (SIZE, SIZE))
    background.putdata([
        tuple(round(low + max(0, 1 - hypot((x - 420) / 850, (y - 300) / 900)) * (high - low))
              for low, high in zip((16, 12, 30), (46, 34, 77)))
        for y in range(SIZE) for x in range(SIZE)
    ])
    draw = ImageDraw.Draw(background)
    if not maskable:
        draw.rounded_rectangle((46, 46, 978, 978), radius=174, outline="#443262", width=12)
    scale = 12 if maskable else 15
    point = lambda x, y: (512 + (x - 32) * scale, 512 + (y - 32) * scale)
    facets = [point(x, y) for x, y in [(32, 11), (50, 24), (32, 53), (14, 24)]]
    draw.polygon(facets, fill="#3a285d")
    draw.line([*facets, facets[0]], fill="#c9b1ff", width=33, joint="curve")
    draw.line([point(32, 11), point(39, 24), point(32, 53), point(25, 24), point(32, 11)],
              fill="#c9b1ff", width=20, joint="curve")
    draw.line([point(14, 24), point(50, 24)], fill="#e2d0ff", width=20)
    return background


regular = icon(False)
for size in (192, 512):
    regular.resize((size, size), Image.Resampling.LANCZOS).save(PUBLIC / f"icon-{size}.png", optimize=True)
icon(True).resize((512, 512), Image.Resampling.LANCZOS).save(PUBLIC / "icon-maskable-512.png", optimize=True)
