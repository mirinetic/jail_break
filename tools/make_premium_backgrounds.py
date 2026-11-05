"""Two detailed wallpapers (1920x1080 JPEG) into app/src/main/assets/www/bg/:
  dawn-sea       여명 바다: sunrise behind mountain peaks over a calm, rippling sea
  ringed-planet  고리 행성: a ringed planet and its moon in a nebula sky

Run:  python3 tools/make_premium_backgrounds.py
Needs numpy and Pillow only. Rendered at twice the size and scaled down for clean edges.
Everything is drawn from code, so the images carry no third-party rights.
"""
import os
import numpy as np
from PIL import Image

SS = 2
W, H = 1920 * SS, 1080 * SS
OUT = os.path.join(os.path.dirname(__file__), "..", "app", "src", "main", "assets", "www", "bg")
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
U, V = xx / W, yy / H


def hexc(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0


def ramp(t, stops):
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,), np.float32)
    for (p0, c0), (p1, c1) in zip(stops[:-1], stops[1:]):
        m = (t >= p0) & (t <= p1)
        k = ((t - p0) / max(p1 - p0, 1e-6))[..., None]
        k = k * k * (3 - 2 * k)
        out = np.where(m[..., None], hexc(c0) * (1 - k) + hexc(c1) * k, out)
    return out


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


class Tex:
    """A seamless (tileable) value-noise texture; sample(x, y) with bilinear filtering at any coordinates."""
    def __init__(self, size, seed, octaves=6, base=4):
        r = np.random.default_rng(seed)
        t, amp, norm = np.zeros((size, size), np.float32), 1.0, 0.0
        c = np.arange(size, dtype=np.float32)
        for o in range(octaves):
            n = base * 2 ** o
            g = r.random((n, n)).astype(np.float32)
            p = c * n / size
            i0 = np.floor(p).astype(np.int32); f = p - i0; f = f * f * (3 - 2 * f)
            i0 %= n; i1 = (i0 + 1) % n
            gy0, gy1 = g[i0], g[i1]                      # rows
            row = gy0 * (1 - f)[:, None] + gy1 * f[:, None]
            t += amp * (row[:, i0] * (1 - f)[None, :] + row[:, i1] * f[None, :])
            norm += amp; amp *= 0.5
        t /= norm
        self.t = (t - t.min()) / (t.max() - t.min())
        self.n = size

    def sample(self, x, y):
        n = self.n
        x = (x % 1.0) * n; y = (y % 1.0) * n
        x0 = np.floor(x).astype(np.int32); y0 = np.floor(y).astype(np.int32)
        fx = x - x0; fy = y - y0
        x0 %= n; y0 %= n; x1 = (x0 + 1) % n; y1 = (y0 + 1) % n
        t = self.t
        a = t[y0, x0] * (1 - fx) + t[y0, x1] * fx
        b = t[y1, x0] * (1 - fx) + t[y1, x1] * fx
        return a * (1 - fy) + b * fy


def ridge_line(seed, base, octaves=7, sharp=True):
    r = np.random.default_rng(seed)
    x = np.linspace(0, 1, W, dtype=np.float32)
    tot, amp, norm, f = np.zeros(W, np.float32), 1.0, 0.0, base
    for _ in range(octaves):
        pts = r.uniform(-1, 1, int(f) + 2).astype(np.float32)
        xs = np.linspace(0, 1, len(pts), dtype=np.float32)
        i = np.clip(np.searchsorted(xs, x) - 1, 0, len(pts) - 2)
        t = (x - xs[i]) / (xs[i + 1] - xs[i]); t = (1 - np.cos(t * np.pi)) / 2
        tot += amp * (pts[i] * (1 - t) + pts[i + 1] * t); norm += amp; amp *= 0.52; f *= 2.05
    h = tot / norm
    return 1 - np.abs(h) * 1.7 if sharp else h


def finish(img, name):
    img = np.clip(img, 0, 1)
    im = Image.fromarray((img * 255).astype(np.uint8)).resize((1920, 1080), Image.LANCZOS)
    a = np.asarray(im, np.float32) / 255.0
    a = a + np.random.default_rng(1).normal(0, 0.008, a.shape).astype(np.float32)   # fine grain against banding
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).save(os.path.join(OUT, name + ".jpg"), quality=90, optimize=True, progressive=True)
    print("wrote", name)


def sea_of_clouds():
    hz = 0.585                       # horizon of the cloud sea
    sx, sy = 0.64, 0.50              # the sun
    img = ramp(V / hz, [(0, "#0f1b44"), (0.28, "#2e3a78"), (0.52, "#8a5f9e"), (0.72, "#e48a86"), (0.88, "#ffb784"), (1, "#ffd9a3")])
    d = np.sqrt(((U - sx) * W / H) ** 2 + (V - sy) ** 2)
    ang = np.arctan2(V - sy, (U - sx) * W / H)
    rays = (0.5 + 0.5 * np.sin(ang * 23 + 1.3)) * (0.5 + 0.5 * np.sin(ang * 37 + 4.0))
    sky_glow = np.exp(-(d / 0.42) ** 2) * 0.55 + np.exp(-(d / 0.13) ** 2) * 0.6 + np.exp(-(d / 0.035) ** 2) * 1.4
    img += sky_glow[..., None] * hexc("#ffd59a") * (0.85 + 0.25 * rays[..., None] * smooth(0.02, 0.2, d)[..., None])
    sun = smooth(0.026, 0.022, d)
    img = img * (1 - sun[..., None]) + hexc("#fffaf0") * sun[..., None]

    # high streaky clouds lit from below
    tx = Tex(512, 11)
    cir = tx.sample(U * 1.3, V * 9.0 + tx.sample(U * 3, V * 2) * 0.6)
    cir = smooth(0.52, 0.8, cir) * smooth(0.05, 0.22, V) * (1 - smooth(0.36, 0.5, V))
    cir_col = ramp(np.clip(1 - d * 1.4, 0, 1), [(0, "#a66f9c"), (0.6, "#f3a487"), (1, "#ffe0b3")])
    img = img * (1 - cir[..., None] * 0.75) + cir_col * cir[..., None] * 0.75

    # mountain peaks: three ranges, the nearest darkest, with sunlit edges facing the sun
    for i, (base_y, amp, col, rim, seed) in enumerate([(0.565, 0.10, "#7b6f9e", 0.5, 4), (0.60, 0.16, "#4b4475", 0.75, 9), (0.66, 0.24, "#2a2650", 1.0, 17)]):
        h = ridge_line(seed, 3 + i, octaves=6)
        line = (base_y - np.clip(h, 0, None) * amp)[None, :] * H
        mask = smooth(-1.0, 1.0, yy - line)
        k = np.ones(41, np.float32) / 41
        slope = np.convolve(np.gradient(line[0]), k, mode='same')[None, :]
        facing = np.clip(slope * np.sign(sx * W - xx) * -0.05, 0, 1)
        edge = np.exp(-np.clip(yy - line, 0, None) / (H * 0.012)) * facing * rim
        haze = hexc("#e7a6a0") * (0.35 - i * 0.1)
        layer = hexc(col) * (1 - 0.25 * smooth(0, H * 0.25, yy - line))[..., None] + haze
        layer = layer + edge[..., None] * hexc("#ffc78f") * 0.9
        img = img * (1 - mask[..., None]) + layer * mask[..., None]

    # the cloud sea: a perspective plane of billowing noise
    below = V > hz
    z = 0.06 / np.clip(V - hz, 0.002, None)                 # distance
    px = (U - 0.5) * z * 1.6
    tc = Tex(1024, 23, 7); td = Tex(512, 29)
    def dens_at(ox, oz):
        wv = td.sample(px * 0.5 + ox * 0.5, z * 0.35 + oz * 0.5)
        return tc.sample(px * 0.42 + ox + wv * 0.35, z * 0.55 + oz + wv * 0.25) * 0.72 + tc.sample(px * 1.3 + ox * 3 + 0.37, z * 1.6 + oz * 3 + 0.61) * 0.28
    d0 = dens_at(0, 0)
    dl = dens_at(0.006 * np.tanh((sx - U) * 6), -0.012)     # a step toward the light (smooth across the sun)
    cover = smooth(0.40, 0.50, d0)                           # puffs; the gaps show the layer below
    light = np.clip((d0 - dl) * 9 + 0.5, 0, 1) * (0.55 + 0.45 * smooth(0.4, 0.75, d0))   # sunlit sides and thicker tops are brighter
    toward = np.exp(-((U - sx) / 0.3) ** 2) * np.exp(-np.clip(V - hz, 0, None) / 0.16)
    top = ramp(light, [(0, "#5a4f8c"), (0.45, "#b48fb8"), (0.75, "#f6b9a2"), (1, "#fff0d8")])
    top = top * (0.8 + 0.4 * toward[..., None]) + toward[..., None] * hexc("#ffd29a") * 0.3 * light[..., None]
    under = ramp(smooth(0.2, 0.6, d0), [(0, "#2c2c63"), (1, "#5b4c86")]) * (0.9 + 0.3 * toward[..., None])
    sea = under * (1 - cover[..., None]) + top * cover[..., None]
    fade = smooth(hz, hz + 0.06, V)[..., None]               # melt into the haze at the horizon
    horizon_col = hexc("#f3b7a2")
    sea = sea * fade + horizon_col * (1 - fade)
    # the sun's path on the water: a widening column of light, broken into glints by the ripples
    depth = np.clip(V - hz, 0, None)
    path = np.exp(-((U - sx) / (0.012 + depth * 0.35)) ** 2) * np.exp(-depth / 0.5)
    glint = smooth(0.55, 0.9, light) * smooth(0.45, 0.8, tc.sample(px * 2.4 + 0.11, z * 3.1 + 0.27))
    sea = sea + (path * (0.35 + 1.4 * glint))[..., None] * hexc("#ffe4b8")
    # faint reflections of the peaks just below the horizon
    refl = np.exp(-depth / 0.05) * 0.25
    sea = sea * (1 - refl[..., None]) + hexc("#3d3566") * refl[..., None]
    img = np.where(below[..., None], sea, img)
    img = img + np.exp(-((V - hz) / 0.012) ** 2)[..., None] * hexc("#ffd9b0") * 0.35   # bright seam at the horizon

    # soft vignette
    vig = 1 - 0.32 * smooth(0.45, 1.05, np.sqrt(((U - 0.5) * 1.2) ** 2 + (V - 0.48) ** 2) * 1.35)
    finish(img * vig[..., None], "dawn-sea")


def ringed_planet():
    img = ramp(V, [(0, "#04030c"), (0.6, "#0a0820"), (1, "#120a26")])
    # nebula: domain-warped noise in magenta and teal
    t1, t2 = Tex(1024, 41, 7), Tex(512, 43)
    q = t2.sample(U * 1.2, V * 0.9)
    n = t1.sample(U * 0.9 + q * 0.8, V * 0.7 + q * 0.6)
    band = np.exp(-(((V - (0.15 + U * 0.55)) / 0.32) ** 2))
    neb = smooth(0.35, 0.95, n) * band
    col = ramp(t2.sample(U * 0.6 + 0.4, V * 0.6), [(0, "#4b1b7a"), (0.45, "#c03a8d"), (0.7, "#ff7a8a"), (1, "#3bc7c4")])
    img += col * neb[..., None] * 0.85
    dust = smooth(0.62, 0.9, t1.sample(U * 2.6 + 0.2, V * 2.2)) * band
    img *= (1 - dust * 0.55)[..., None]

    # stars of different sizes, a few with a cross glint
    r = np.random.default_rng(5)
    star = np.zeros((H, W), np.float32)
    for _ in range(5200):
        x, y = int(r.uniform(0, W)), int(r.uniform(0, H)); b = r.uniform(0.25, 1.0) ** 2
        star[y, x] = max(star[y, x], b)
    sm = np.asarray(Image.fromarray(star, "F").resize((W // 2, H // 2), Image.BILINEAR).resize((W, H), Image.BICUBIC), np.float32)
    img += (star * 0.9 + sm * 1.4)[..., None] * np.array([0.95, 0.95, 1.0], np.float32)
    for _ in range(26):
        x, y, b = r.uniform(0, W), r.uniform(0, H * 0.8), r.uniform(0.5, 1)
        dx, dy = np.abs(xx - x), np.abs(yy - y)
        g = (np.exp(-(dx / 3) ** 2) * np.exp(-(dy / 60) ** 2) + np.exp(-(dy / 3) ** 2) * np.exp(-(dx / 60) ** 2)) * 0.6 + np.exp(-((dx ** 2 + dy ** 2) / 90)) * 1.2
        img += (g * b)[..., None] * hexc(["#cfe0ff", "#ffe6c7", "#ffd0e8"][int(r.integers(0, 3))])

    # the planet, lit from the upper left
    cx, cy, R = 0.74 * W, 0.80 * H, 0.42 * H
    dx, dy = (xx - cx) / R, (yy - cy) / R
    rr = dx * dx + dy * dy
    inside = rr < 1
    nz = np.sqrt(np.clip(1 - rr, 0, 1))
    L = np.array([-0.62, -0.55, 0.56]); L /= np.linalg.norm(L)
    lam = np.clip(dx * L[0] + dy * L[1] + nz * L[2], 0, 1)
    lat = dy / np.maximum(nz, 0.05) * 0.0 + dy                       # bands follow latitude
    tb = Tex(512, 51)
    bands = tb.sample(dx * 0.12 + 0.1, lat * 1.4 + tb.sample(dx * 0.8, dy * 0.8) * 0.12)
    surf = ramp(bands, [(0, "#5a3f8a"), (0.3, "#8a5aa6"), (0.5, "#cf86a8"), (0.7, "#efb9a2"), (1, "#f8dcc4")])
    shade = (lam ** 0.9 * 1.05 + 0.03) * (0.75 + 0.25 * nz)
    planet = surf * shade[..., None]
    rim = np.exp(-((np.sqrt(rr) - 1.0) / 0.035) ** 2) * (0.35 + 0.9 * np.clip(-(dx * 0.7 + dy * 0.7) + 0.4, 0, 1))
    edge = smooth(1.0, 0.996, np.sqrt(rr))
    img = img * (1 - edge[..., None]) + planet * edge[..., None]
    img += rim[..., None] * hexc("#8fd8ff") * 0.75
    atm = np.exp(-np.clip(np.sqrt(rr) - 1, 0, None) / 0.06) * (np.sqrt(rr) > 1) * np.clip(-(dx + dy) * 0.6 + 0.3, 0, 1)
    img += atm[..., None] * hexc("#6fb6ff") * 0.35

    # rings: a tilted ellipse band in front of the lower half, behind the upper half, with the planet's shadow
    tilt = 0.24
    ex, ey = dx * np.cos(-0.32) - dy * np.sin(-0.32), dx * np.sin(-0.32) + dy * np.cos(-0.32)
    rd = np.sqrt(ex ** 2 + (ey / tilt) ** 2)
    ringn = Tex(256, 61).sample(rd * 3.0, rd * 0.0 + 0.3)
    ring = smooth(1.35, 1.4, rd) * (1 - smooth(2.05, 2.12, rd)) * (0.45 + 0.55 * ringn) * (1 - 0.8 * np.exp(-((rd - 1.75) / 0.025) ** 2))
    front = (ey > 0) | ~inside
    shadow = 1 - 0.75 * ((ex * L[0] + ey * L[1]) > 0.15) * (rd < 1.9) * 0.0
    ring_col = ramp(rd - 1.35, [(0, "#d9b7c9"), (0.35, "#f6dcc4"), (0.7, "#b99ac7")]) * (0.55 + 0.6 * np.clip(-ex * 0.5 + 0.6, 0, 1))[..., None]
    a = (ring * 0.85 * front)[..., None]
    img = img * (1 - a) + ring_col * shadow[..., None] * a
    # the ring's shadow on the planet, just below it
    rs = np.exp(-((ey - 0.13 - ex * 0.05) / 0.05) ** 2) * inside * (np.abs(ex) < 1)
    img *= (1 - rs * 0.45)[..., None]

    # a small moon
    mx, my, mr = 0.30 * W, 0.30 * H, 0.045 * H
    mdx, mdy = (xx - mx) / mr, (yy - my) / mr
    mrr = mdx ** 2 + mdy ** 2
    mz = np.sqrt(np.clip(1 - mrr, 0, 1))
    ml = np.clip(mdx * L[0] + mdy * L[1] + mz * L[2], 0, 1)
    moon = ramp(Tex(128, 71).sample(mdx * 0.4, mdy * 0.4), [(0, "#7f7a96"), (1, "#e9e2ef")]) * (ml ** 0.8 * 1.1 + 0.03)[..., None]
    me = smooth(1.0, 0.97, np.sqrt(mrr))[..., None]
    img = img * (1 - me) + moon * me

    vig = 1 - 0.35 * smooth(0.5, 1.1, np.sqrt(((U - 0.5) * 1.1) ** 2 + (V - 0.5) ** 2) * 1.4)
    finish(img * vig[..., None], "ringed-planet")


if __name__ == "__main__":
    import sys
    which = sys.argv[1:] or ["sea", "planet"]
    if "sea" in which: sea_of_clouds()
    if "planet" in which: ringed_planet()
