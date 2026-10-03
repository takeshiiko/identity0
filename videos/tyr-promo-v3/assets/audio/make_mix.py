"""Tyr promo v3 audio: ambient music bed + SFX synced to the camera / cursor events in index.html.
Deterministic (seeded). Placeholder until a licensed track is dropped in: keep the SFX layer
(sfx.wav) and replace music.wav, or point index.html at a new mix."""
import numpy as np, wave, os

SR = 44100; DUR = 50.0; N = int(SR * DUR)
rng = np.random.default_rng(11)
HERE = os.path.dirname(os.path.abspath(__file__))

def buf(): return np.zeros(N)
def at(t): return int(t * SR)
def add(dst, sig, t, g=1.0):
    s = at(t); e = min(N, s + len(sig))
    if s < N: dst[s:e] += sig[: e - s] * g
def lp(x, a):
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y
def env(n, a, d):
    x = np.arange(n) / SR; return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / d)
def note(m): return 440 * 2 ** ((m - 69) / 12)
def tri(f, n):
    x = np.arange(n) / SR; return 2 * np.abs(2 * ((x * f) % 1) - 1) - 1
def saw(f, n):
    x = np.arange(n) / SR; return 2 * ((x * f) % 1) - 1

# ---------------- music ----------------
music = buf()
def pad(ms, t, d, g):
    n = int(SR * d); s = np.zeros(n)
    for m in ms:
        for det in (-0.08, 0.0, 0.08): s += saw(note(m + det), n) * 0.5 + tri(note(m + det), n) * 0.5
    s = lp(s / (len(ms) * 3), 0.02)
    x = np.arange(n) / SR
    s *= np.minimum(1, x / 1.0) * np.clip((d - x) / 1.2, 0, 1)
    add(music, s, t, g)
def sub(m, t, d, g):
    n = int(SR * d); x = np.arange(n) / SR
    s = np.sin(2 * np.pi * note(m) * x) * np.minimum(1, x / 0.05) * np.clip((d - x) / 0.3, 0, 1)
    add(music, s, t, g)
def soft_kick(t, g):
    n = int(SR * 0.35); x = np.arange(n) / SR
    add(music, np.sin(2 * np.pi * np.cumsum(48 + 70 * np.exp(-x * 30)) / SR) * np.exp(-x * 9), t, g)
def hat(t, g):
    n = int(SR * 0.05); s = rng.standard_normal(n); s = s - lp(s, 0.5)
    add(music, s * env(n, 0.001, 0.012), t, g)
def pluck(m, t, g):
    n = int(SR * 0.5); s = tri(note(m), n) + 0.3 * saw(note(m + 12), n)
    add(music, lp(s, 0.12) * env(n, 0.003, 0.16), t, g)

BEAT = 0.5
prog = [(45, [57, 60, 64, 71]), (41, [53, 57, 60, 64]), (48, [55, 60, 64, 67]), (43, [55, 59, 62, 66])]  # Am9 Fmaj7 Cadd9 G6
for k, t0 in enumerate(np.arange(0, 44.0, 4.0)):
    root, ch = prog[k % 4]
    pad(ch, t0, 4.6, 0.55)
    sub(root - 12, t0, 4.0, 0.22 if t0 >= 7.6 else 0.1)
# arp from the brand reveal on, 8ths, quiet
for i, t in enumerate(np.arange(7.6, 41.5, BEAT / 2)):
    root, ch = prog[int(t // 4) % 4]
    pluck(ch[i % 4] + 12, t, 0.10 if t < 17 else 0.13)
# soft groove under the product (17–41.5)
for t in np.arange(17.0, 41.5, BEAT):
    soft_kick(t, 0.32); hat(t + BEAT / 2, 0.10)
# resolve on the CTA
pad([45, 57, 60, 64, 69, 71], 44.6, 5.4, 0.8); sub(33, 44.6, 5.0, 0.3)
# master fades
x = np.arange(N) / SR
music *= np.clip(x / 0.8, 0, 1) * np.clip((DUR - x) / 2.0, 0, 1)

# ---------------- sfx ----------------
sfx = buf()
def whoosh(t, d, g=1.0):
    n = int(SR * d); s = rng.standard_normal(n); out = np.empty(n); acc = 0.0
    ph = np.arange(n) / n
    for i in range(n):
        a = 0.02 + 0.35 * np.sin(np.pi * ph[i]) ** 2; acc += a * (s[i] - acc); out[i] = acc
    out = out - lp(out, 0.01)
    add(sfx, out * np.sin(np.pi * ph) ** 1.5, t, g)
def click(t, g=1.0):
    n = int(SR * 0.04); x = np.arange(n) / SR
    s = np.sin(2 * np.pi * 1800 * x) * np.exp(-x * 220) + 0.4 * rng.standard_normal(n) * np.exp(-x * 400)
    add(sfx, s, t, g)
def tick(t, g=0.25):
    n = int(SR * 0.012); s = rng.standard_normal(n); s = s - lp(s, 0.4)
    add(sfx, s * env(n, 0.0005, 0.003), t, g)
def pop(t, g=0.6):
    n = int(SR * 0.09); x = np.arange(n) / SR
    add(sfx, np.sin(2 * np.pi * np.cumsum(380 + 700 * np.exp(-x * 60)) / SR) * np.exp(-x * 40), t, g)
def chime(t, g=0.5):
    n = int(SR * 1.2); x = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * x) * a for f, a in ((1318.5, 1), (1975.5, .6), (2637, .25))) * np.exp(-x * 3.5)
    add(sfx, s * np.minimum(1, x / 0.003), t, g)
def boom(t, d=2.5, g=1.0):
    n = int(SR * d); x = np.arange(n) / SR
    s = np.sin(2 * np.pi * np.cumsum(32 + 50 * np.exp(-x * 5)) / SR) * np.exp(-x * 1.6)
    add(sfx, s + 0.3 * lp(rng.standard_normal(n), 0.05) * np.exp(-x * 4), t, g)
def riser(t, d, g=0.6):
    n = int(SR * d); s = rng.standard_normal(n); out = np.empty(n); acc = 0.0
    for i in range(n):
        a = 0.01 + 0.5 * (i / n) ** 2; acc += a * (s[i] - acc); out[i] = acc
    add(sfx, (out - lp(out, 0.02)) * (np.arange(n) / n) ** 2, t, g)

boom(0.0, 2.5, 0.6); whoosh(0.0, 2.2, 0.35)                    # opening pull-back
for t in (2.2,): whoosh(t, 0.8, 0.4)                             # panel swings in
for i in range(4): pop(3.0 + i * 0.32, 0.5)                      # alerts land
click(5.7);
for i in range(4): whoosh(5.85 + i * 0.07, 0.25, 0.15)           # alerts cleared
whoosh(6.8, 0.8, 0.9)                                            # A → B
boom(7.6, 2.0, 0.7); chime(7.7, 0.25)                            # logo
whoosh(11.2, 0.9, 0.8)                                           # B → C
pop(12.1, 0.5); pop(12.6, 0.5); whoosh(13.5, 0.3, 0.3); pop(13.65, 0.4); whoosh(14.3, 0.3, 0.3); pop(14.45, 0.4)
whoosh(16.2, 0.9, 0.95); boom(17.0, 1.5, 0.4)                    # C → D (dark)
whoosh(16.8, 1.2, 0.35)                                          # ticket tilts in
whoosh(18.2, 1.0, 0.45)                                          # dive to the field
for i in range(44): tick(19.2 + i * (1.0 / 44), 0.22)            # typing the mint
tick(20.42, 0.3)                                                 # budget
whoosh(20.6, 0.9, 0.3)
click(21.55); click(22.35); whoosh(22.5, 0.9, 0.35)
for k in range(4): pop(23.1 + k * 0.5, 0.35)                     # pipeline steps
click(25.1); pop(25.4, 0.35); pop(25.7, 0.35); chime(25.8, 0.45)  # execute → open
whoosh(26.9, 0.9, 0.85)                                          # D → E
whoosh(28.6, 2.2, 0.12)                                          # price drifting
boom(30.5, 1.2, 0.35)                                            # out of range
click(31.6); whoosh(31.8, 0.35, 0.3); pop(32.15, 0.4); chime(32.5, 0.35)
whoosh(34.9, 0.8, 0.9)                                           # E → F
for i in range(16): tick(36.0 + i * 0.125, 0.12)                 # fees accruing
click(38.4); whoosh(38.75, 0.6, 0.45); chime(39.35, 0.45)
riser(40.3, 1.3, 0.5); whoosh(41.5, 1.4, 0.9)                    # pull back
boom(42.5, 2.0, 0.6); pop(43.3, 0.4)
whoosh(44.6, 0.5, 0.4); boom(45.0, 3.0, 0.7)
click(47.5); chime(47.55, 0.4)

# ---------------- master ----------------
def norm(x, peak): return x / (np.max(np.abs(x)) + 1e-9) * peak
music = norm(music, 0.42); sfx = norm(sfx, 0.75)
mix = np.tanh((music + sfx) * 1.1) * 0.9
def write(path, mono):
    st = np.stack([mono, np.roll(mono, int(SR * 0.006)) * 0.98], 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(st, -1, 1) * 32767).astype("<i2").tobytes())
write(os.path.join(HERE, "mix.wav"), mix)
write(os.path.join(HERE, "sfx.wav"), np.tanh(sfx))
print("ok")
