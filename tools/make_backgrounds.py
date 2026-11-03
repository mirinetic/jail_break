"""Generates the built-in wallpapers (1920x1080 JPEG) into app/src/main/assets/www/bg/.

Run:  python3 tools/make_backgrounds.py
Needs numpy and Pillow. Every scene is drawn from code, so the images carry no third-party rights.
"""
import os
import numpy as np
from PIL import Image, ImageFilter

W, H = 1920, 1080
OUT = os.path.join(os.path.dirname(__file__), "..", "app", "src", "main", "assets", "www", "bg")
rng = np.random.default_rng(7)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
v = yy / (H - 1)
u = xx / (W - 1)


def hexc(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0


def ramp(t, stops):
    """Vertical/1D colour ramp: stops = [(pos, '#hex'), ...]."""
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,), np.float32)
    for (p0, c0), (p1, c1) in zip(stops[:-1], stops[1:]):
        m = (t >= p0) & (t <= p1)
        k = ((t - p0) / max(p1 - p0, 1e-6))[..., None]
        k = k * k * (3 - 2 * k)
        out = np.where(m[..., None], hexc(c0) * (1 - k) + hexc(c1) * k, out)
    return out


def noise1d(n, octaves=6, seed=0, base=6, persistence=0.5):
    r = np.random.default_rng(seed)
    x = np.linspace(0, 1, n)
    total, amp, freq, norm = np.zeros(n), 1.0, base, 0.0
    for _ in range(octaves):
        pts = r.uniform(-1, 1, int(freq) + 2)
        xs = np.linspace(0, 1, len(pts))
        # cosine interpolation for smooth ridges
        idx = np.clip(np.searchsorted(xs, x) - 1, 0, len(pts) - 2)
        t = (x - xs[idx]) / (xs[idx + 1] - xs[idx])
        t = (1 - np.cos(t * np.pi)) / 2
        total += amp * (pts[idx] * (1 - t) + pts[idx + 1] * t)
        norm += amp
        amp *= persistence
        freq *= 2
    return total / norm


def glow(img, cx, cy, radius, color, strength):
    d = np.sqrt(((xx - cx) / W) ** 2 + ((yy - cy) / W) ** 2)
    g = np.exp(-(d / radius) ** 2)[..., None] * strength
    return img + g * hexc(color)


def ridge(img, base_y, amp, seed, color, haze_color, haze, octaves=6, base=5, sharp=False, mist=0.0):
    h = noise1d(W, octaves, seed, base)
    if sharp:
        h = 1 - np.abs(h) * 1.6
    line = (base_y - h * amp)[None, :]
    mask = np.clip((yy - line) / 1.5, 0, 1)[..., None]
    col = hexc(color) * (1 - haze) + hexc(haze_color) * haze
    # light vertical shading within the layer
    depth = np.clip((yy - line) / (H * 0.5), 0, 1)[..., None]
    layer = col * (1 - 0.18 * depth)
    img = img * (1 - mask) + layer * mask
    if mist > 0:
        m = np.exp(-np.clip(yy - line, 0, None) / (H * 0.06))[..., None] * mask * mist
        img = img * (1 - m) + hexc(haze_color) * m
    return img


def trees(img, base_y, amp, seed, color, density=180):
    r = np.random.default_rng(seed)
    h = noise1d(W, 4, seed, 3) * amp
    spikes = np.zeros(W)
    for cx in r.uniform(0, W, density):
        hw = r.uniform(8, 22)
        hh = r.uniform(30, 90)
        xs = np.arange(max(0, int(cx - hw)), min(W, int(cx + hw)))
        spikes[xs] = np.maximum(spikes[xs], hh * (1 - np.abs(xs - cx) / hw))
    line = (base_y - h - spikes)[None, :]
    mask = np.clip((yy - line) / 1.2, 0, 1)[..., None]
    return img * (1 - mask) + hexc(color) * mask


def stars(img, n, top=0.6, seed=3):
    r = np.random.default_rng(seed)
    out = img.copy()
    for _ in range(n):
        x, y = int(r.uniform(0, W)), int(r.uniform(0, H * top) ** 1.0)
        b = r.uniform(0.3, 1.0) * (1 - y / (H * top)) ** 0.5
        s = 1 if r.random() < 0.9 else 2
        out[y:y + s, x:x + s] = np.maximum(out[y:y + s, x:x + s], b)
    return out


def finish(img, name, blur=0.0):
    img = np.clip(img, 0, 1)
    img = img + rng.normal(0, 0.012, img.shape).astype(np.float32)  # film grain, kills banding
    im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    os.makedirs(OUT, exist_ok=True)
    im.save(os.path.join(OUT, name + ".jpg"), quality=86, optimize=True, progressive=True)
    print("wrote", name)


# 1. Blue ridges at dawn
img = ramp(v, [(0, "#2b3f6b"), (0.45, "#8fa6cf"), (0.62, "#f1c9b0"), (1, "#f1c9b0")])
img = glow(img, W * 0.68, H * 0.52, 0.18, "#ffd9b0", 0.55)
for i, (y, a, c) in enumerate([(0.55, 160, "#7d8fbf"), (0.66, 170, "#5a6d9f"), (0.77, 180, "#3d4d7c"), (0.9, 200, "#232c4c")]):
    img = ridge(img, H * y, a, 10 + i, c, "#c9cfe6", 0.55 - i * 0.15, mist=0.35 - i * 0.07)
finish(img, "blue-ridges")

# 2. Golden hour hills
img = ramp(v, [(0, "#3a3a6e"), (0.35, "#d9876b"), (0.58, "#ffd28f"), (1, "#ffd28f")])
img = glow(img, W * 0.3, H * 0.56, 0.08, "#fff3cf", 1.2)
img = glow(img, W * 0.3, H * 0.56, 0.3, "#ffb36b", 0.4)
for i, (y, a, c) in enumerate([(0.62, 90, "#b9705c"), (0.72, 110, "#8a4a48"), (0.84, 120, "#5a2f3c"), (0.97, 120, "#2e1a2a")]):
    img = ridge(img, H * y, a, 20 + i, c, "#ffc79a", 0.45 - i * 0.13, base=3, mist=0.25 - i * 0.06)
finish(img, "golden-hour")

# 3. Night peaks with stars
img = ramp(v, [(0, "#05081a"), (0.5, "#18234e"), (0.75, "#3d3a6b"), (1, "#3d3a6b")])
img = glow(img, W * 0.72, H * 0.42, 0.25, "#5b8dd6", 0.35)
img = stars(img, 1400)
img = glow(img, W * 0.8, H * 0.18, 0.012, "#fffbe8", 1.3)
for i, (y, a, c) in enumerate([(0.66, 230, "#2a3263"), (0.8, 200, "#1a1f42"), (0.95, 160, "#0b0d20")]):
    img = ridge(img, H * y, a, 30 + i, c, "#4a5a96", 0.35 - i * 0.12, sharp=True, mist=0.2 - i * 0.06)
finish(img, "night-peaks")

# 4. Desert dunes
img = ramp(v, [(0, "#4f8fc4"), (0.42, "#bfe0f0"), (1, "#bfe0f0")])
img = glow(img, W * 0.82, H * 0.2, 0.12, "#ffffff", 0.35)
for i, (y, f, c) in enumerate([(0.5, 2.0, "#e8b07a"), (0.62, 1.5, "#d99355"), (0.78, 1.1, "#c27740"), (0.95, 0.8, "#a45b2c")]):
    ph = rng.uniform(0, 6.28)
    curve = H * y - 70 * np.sin(u[0] * f * 6.28 + ph) - 35 * np.sin(u[0] * f * 13 + ph * 2)
    line = curve[None, :]
    mask = np.clip((yy - line) / 1.5, 0, 1)[..., None]
    slope = np.gradient(curve)[None, :]
    shade = (1 - 0.35 * np.clip(slope / 3, -1, 1))[..., None]
    depth = np.clip((yy - line) / (H * 0.3), 0, 1)[..., None]
    col = hexc(c) * shade * (1 - 0.15 * depth)
    img = img * (1 - mask) + col * mask
finish(img, "desert-dunes")

# 5. Ocean at dusk
horizon = 0.58
img = ramp(v / horizon, [(0, "#24345e"), (0.6, "#c47a8a"), (1, "#ffc59a")])
img = glow(img, W * 0.5, H * (horizon - 0.04), 0.05, "#fff1d6", 1.1)
sea = ramp((v - horizon) / (1 - horizon), [(0, "#7a6a8f"), (1, "#141c33")])
ripple = (np.sin(yy * 0.9 + np.sin(xx * 0.013) * 3) * 0.5 + 0.5)[..., None]
path = np.exp(-((xx - W * 0.5) / (W * (0.03 + 0.18 * (v - horizon))) ) ** 2)[..., None]
sea = sea + path * ripple * hexc("#ffd2a6") * 0.6 * (v[..., None] > horizon)
img = np.where((v > horizon)[..., None], sea, img)
img = ridge(img, H * horizon + 2, 50, 51, "#3b2f4d", "#a07a96", 0.3, base=2, octaves=4)
img = np.where((v > horizon + 0.012)[..., None], sea, img)
finish(img, "ocean-dusk")

# 6. Forest fog
img = ramp(v, [(0, "#9fb5ad"), (0.6, "#dfe6dc"), (1, "#dfe6dc")])
for i, (y, c) in enumerate([(0.5, "#8ea398"), (0.6, "#6d8478"), (0.72, "#4a6155"), (0.86, "#2c4036"), (1.0, "#16221c")]):
    img = trees(img, H * y, 40, 60 + i, c, density=140 + i * 40)
    if i < 4:
        fog = np.exp(-((yy - H * (y + 0.03)) / (H * 0.045)) ** 2)[..., None] * 0.55
        img = img * (1 - fog) + hexc("#e6ece4") * fog
finish(img, "forest-fog")

# 7. Mirror lake
horizon = 0.6
img = ramp(v, [(0, "#7fa1c9"), (0.5, "#e8d5e6"), (0.6, "#f6e3d6"), (1, "#f6e3d6")])
img = glow(img, W * 0.42, H * 0.45, 0.2, "#fff2e0", 0.4)
for i, (y, a, c) in enumerate([(0.5, 200, "#9d9fc4"), (0.58, 150, "#6f7aa6"), (0.6, 80, "#47557f")]):
    img = ridge(img, H * y, a, 70 + i, c, "#e6dbe8", 0.4 - i * 0.12, sharp=(i == 0))
top = img[: int(H * horizon)]
refl = top[::-1]
n = H - int(H * horizon)
refl = refl[:n] if refl.shape[0] >= n else np.vstack([refl, np.repeat(refl[-1:], n - refl.shape[0], 0)])
wob = (np.sin(np.arange(n) * 0.7)[:, None, None] * 0.02)
refl = refl * 0.82 + hexc("#2a3556") * 0.12 + wob
img[int(H * horizon):] = refl
finish(img, "mirror-lake")

# 8. Soft aurora
img = ramp(v, [(0, "#0b1426"), (1, "#14233b")])
for cx, cy, r, c, s in [(0.2, 0.3, 0.35, "#2fbf9f", 0.55), (0.55, 0.2, 0.3, "#6a5cff", 0.5), (0.85, 0.45, 0.32, "#ff6fa8", 0.35), (0.45, 0.75, 0.4, "#1d6fd1", 0.35)]:
    img = glow(img, W * cx, H * cy, r, c, s)
band = np.exp(-((v - (0.35 + 0.12 * np.sin(u * 5.2))) / 0.06) ** 2)[..., None]
img = img + band * hexc("#7cf2c8") * 0.35
img = stars(img, 500, top=1.0, seed=9)
finish(img, "soft-aurora", blur=1.2)

# 9. Snowy peaks
img = ramp(v, [(0, "#6f9ad6"), (0.45, "#c9dcf2"), (1, "#eef4fb")])
img = glow(img, W * 0.3, H * 0.2, 0.15, "#ffffff", 0.35)
for i, (y, a, c) in enumerate([(0.55, 260, "#f4f7fc"), (0.68, 200, "#b9c8de"), (0.8, 150, "#7f93b3")]):
    img = ridge(img, H * y, a, 90 + i, c, "#dfe8f4", 0.2 - i * 0.06, octaves=4, base=4)
img = trees(img, H * 0.97, 30, 95, "#1f2f2c", density=260)
finish(img, "snowy-peaks")

# 10. City at night
img = ramp(v, [(0, "#070b1c"), (0.55, "#1b2450"), (0.78, "#523a6b"), (1, "#1a1426")])
img = stars(img, 300, top=0.4, seed=11)
img = glow(img, W * 0.5, H * 0.8, 0.45, "#ff9a5c", 0.25)
r = np.random.default_rng(12)
for layer, (base, hmin, hmax, col, lit) in enumerate([(0.82, 80, 260, "#1d2140", 0.08), (0.9, 120, 420, "#10132a", 0.16), (1.0, 60, 220, "#07081a", 0.1)]):
    x = 0
    while x < W:
        bw = int(r.uniform(50, 140)); bh = int(r.uniform(hmin, hmax)); top = int(H * base - bh)
        img[max(top, 0):int(H * base), x:x + bw] = hexc(col)
        for wy in range(top + 10, int(H * base) - 8, 18):
            for wx in range(x + 8, x + bw - 8, 16):
                if r.random() < lit:
                    img[wy:wy + 8, wx:wx + 6] = hexc("#ffd58a") * r.uniform(0.6, 1.0)
        x += bw + int(r.uniform(2, 14))
finish(img, "city-night")

# 11. Sunny beach
horizon = 0.55
img = ramp(v, [(0, "#2f86d6"), (0.5, "#9fd2f2"), (1, "#9fd2f2")])
for cx, cy, rr in [(0.2, 0.18, 0.06), (0.27, 0.2, 0.05), (0.7, 0.12, 0.07), (0.78, 0.15, 0.05)]:
    d = (((xx - W * cx) / (W * rr)) ** 2 + ((yy - H * cy) / (H * rr * 0.9)) ** 2)
    img = img + (np.exp(-d * 2.2)[..., None] * 0.5) * (hexc("#ffffff") - img)
sea = ramp((v - horizon) / 0.2, [(0, "#1d79a8"), (1, "#36c1c4")])
img = np.where((v > horizon)[..., None], sea, img)
shore = H * 0.75 + 25 * np.sin(u[0] * 9) + 12 * np.sin(u[0] * 23)
sand = ramp((v - 0.72) / 0.28, [(0, "#f2dfb8"), (1, "#d9b98a")])
mask = (yy > shore[None, :])[..., None]
foam = (np.abs(yy - shore[None, :]) < 6)[..., None]
img = np.where(mask, sand, img)
img = np.where(foam, hexc("#ffffff") * 0.95, img)
finish(img, "sunny-beach")

# 12. Autumn forest
img = ramp(v, [(0, "#f4c99b"), (0.55, "#f7e2c4"), (1, "#f7e2c4")])
for i, (y, c) in enumerate([(0.52, "#e3a46b"), (0.63, "#d9803f"), (0.75, "#b85a2a"), (0.88, "#7f3519"), (1.02, "#3d1c10")]):
    img = trees(img, H * y, 35, 120 + i, c, density=150 + i * 40)
    if i < 4:
        fog = np.exp(-((yy - H * (y + 0.03)) / (H * 0.045)) ** 2)[..., None] * 0.45
        img = img * (1 - fog) + hexc("#f7e6cf") * fog
finish(img, "autumn-forest")

# 13. Milky way
img = ramp(v, [(0, "#03040c"), (0.7, "#0b1030"), (1, "#141a3a")])
band = np.exp(-(((yy - (H * 0.95 - xx * 0.6)) / (H * 0.16)) ** 2))[..., None]
cloudn = np.random.default_rng(14).normal(0, 1, (H // 8 + 1, W // 8 + 1))
cloudn = np.array(Image.fromarray(((cloudn - cloudn.min()) / np.ptp(cloudn) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(18))) / 255.0
img = img + band * (0.25 + 0.5 * cloudn[..., None]) * hexc("#b9b3e6") * 0.6
img = glow(img, W * 0.45, H * 0.5, 0.18, "#e7a8c9", 0.12)
img = stars(img, 2600, top=1.0, seed=15)
img = ridge(img, H * 0.93, 70, 140, "#05060d", "#05060d", 0.0, base=3)
finish(img, "milky-way")

# 14. Blossom dawn
img = ramp(v, [(0, "#b8a6e0"), (0.45, "#f3c3d6"), (0.7, "#ffe2cf"), (1, "#ffe2cf")])
r = np.random.default_rng(16)
for _ in range(60):
    cx, cy, rr = r.uniform(0, W), r.uniform(0, H * 0.75), r.uniform(20, 70)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    a = np.clip((rr - d) / 6, 0, 1)[..., None] * r.uniform(0.08, 0.22)
    img = img * (1 - a) + hexc("#ffd6e7") * a
for i, (y, a, c) in enumerate([(0.74, 70, "#d9a3c4"), (0.84, 80, "#b77fa8"), (0.96, 70, "#7a4f7c")]):
    img = ridge(img, H * y, a, 160 + i, c, "#f3d1e1", 0.3 - i * 0.1, base=3, octaves=4)
finish(img, "blossom-dawn", blur=0.6)
