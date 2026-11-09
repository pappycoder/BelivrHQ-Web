#!/usr/bin/env python3
# One-off favicon / PWA icon / OG image generator for BelivrHQ-Web.
# Sources the transparent navy brand derivatives in public/brand/ (produced by
# scripts/gen-brand.mjs) and writes:
#   src/app/favicon.ico                       (16/32/48 multi-size)
#   public/icons/icon-{192,512}.png           (transparent navy emblem)
#   public/icons/maskable-{192,512}.png       (emblem within the safe zone)
#   public/og.png                             (1200x630 share image)
# Run: python3 scripts/gen-icons.py
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BRAND = os.path.join(ROOT, "public", "brand")
ICONS = os.path.join(ROOT, "public", "icons")
APP = os.path.join(ROOT, "src", "app")

EMBLEM = os.path.join(BRAND, "belivrhq-emblem.png")
OG = os.path.join(ROOT, "public", "og.png")

NAVY = (4, 30, 78)
NAVY_LIGHT = (30, 60, 120)


def centered(im, side, coverage):
    """Center `im` (RGBA) on a transparent `side`x`side` canvas at `coverage`%."""
    scale = int(side * coverage)
    resized = im.resize((scale, scale), Image.LANCZOS)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    x = (side - scale) // 2
    y = (side - scale) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def main():
    os.makedirs(ICONS, exist_ok=True)
    emblem = Image.open(EMBLEM).convert("RGBA")

    # --- favicon.ico (multi-size) ---
    sizes = [256, 48, 32, 16]
    fav_imgs = [emblem.resize((s, s), Image.LANCZOS).convert("RGBA") for s in sizes]
    fav_imgs[0].save(
        os.path.join(APP, "favicon.ico"),
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=fav_imgs[1:],
    )
    print("favicon.ico written")

    # --- PWA icons ---
    for s in [192, 512]:
        icon = centered(emblem, s, 0.9)
        icon.save(os.path.join(ICONS, f"icon-{s}x{s}.png"))
        maskable = centered(emblem, s, 0.62)
        # maskable icons need a solid fill (the OS masks to a circle); white
        # matches manifest background_color so it blends with any theme.
        fill = Image.new("RGBA", (s, s), (255, 255, 255, 255))
        fill.alpha_composite(maskable)
        fill.convert("RGB").save(os.path.join(ICONS, f"maskable-{s}x{s}.png"))
    print("PWA icons written")

    # --- OG image (1200x630) ---
    W, H = 1200, 630
    og = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # soft brand gradient background
    bg = Image.new("RGB", (1, 2), (240, 243, 248))
    # vertical gradient light->slightly navy-tinted
    top = (245, 247, 251)
    bottom = (222, 229, 242)
    grad = Image.new("RGB", (W, H))
    px = grad.load()
    for y in range(H):
        t = y / (H - 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        for x in range(W):
            px[x, y] = (r, g, b)
    og = grad.convert("RGBA")

    # center emblem at ~34% height
    e_h = int(H * 0.30)
    e_w = int(emblem.size[0] / emblem.size[1] * e_h)
    e = emblem.resize((e_w, e_h), Image.LANCZOS)
    ex = (W - e_w) // 2
    ey = (H - e_h) // 2 - 40
    og.paste(e, (ex, ey), e)

    # wordmark "BelivrHQ" beneath the emblem
    try:
        from PIL import ImageFont
        # find a bold TTF
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]
        fp = next((c for c in candidates if os.path.exists(c)), None)
        if fp:
            f = ImageFont.truetype(fp, 88)
            d = ImageDraw.Draw(og)
            tw = d.textlength("BelivrHQ", font=f)
            d.text(((W - tw) / 2, ey + e_h + 10), "BelivrHQ", font=f, fill=NAVY)
            # tagline
            f2 = ImageFont.truetype(fp, 36)
            sub = "Church Management Platform"
            sw = d.textlength(sub, font=f2)
            d.text(((W - sw) / 2, ey + e_h + 110), sub, font=f2, fill=NAVY_LIGHT)
    except Exception as e:
        print("og text skipped:", e)

    og.convert("RGB").save(OG, "PNG")
    print("og.png written")


if __name__ == "__main__":
    main()
