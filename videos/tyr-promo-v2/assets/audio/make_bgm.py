"""Synthesize the Tyr promo music bed: 45s, 120 BPM, D minor, dark electronic.
Deterministic (seeded). Sections line up with the storyboard frames."""
import numpy as np, wave
SR=44100; BPM=120; BEAT=60/BPM; DUR=45.0
N=int(SR*DUR); t=np.arange(N)/SR
rng=np.random.default_rng(7)
mix=np.zeros(N)
def at(sec): return int(sec*SR)
def add(sig,start,gain=1.0):
    s=at(start); e=min(N,s+len(sig)); mix[s:e]+=sig[:e-s]*gain
def env(n,a=0.005,d=0.2):
    x=np.arange(n)/SR; return np.minimum(1,x/a)*np.exp(-x/d)
def lp(x,a):  # one-pole lowpass, a in (0,1)
    y=np.empty_like(x); acc=0.0
    for i in range(len(x)): acc+=a*(x[i]-acc); y[i]=acc
    return y
def kick(d=0.45):
    n=int(SR*d); x=np.arange(n)/SR; f=45+110*np.exp(-x*28)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-x*7)
def hat(d=0.06):
    n=int(SR*d); s=rng.standard_normal(n); s=s-lp(s,0.6); return s*env(n,0.001,0.018)
def clap():
    n=int(SR*0.25); s=rng.standard_normal(n); s=s-lp(s,0.15); return s*env(n,0.002,0.06)
def saw(f,n):
    x=np.arange(n)/SR; return 2*((x*f)%1)-1
def note(m): return 440*2**((m-69)/12)
def pad(ms,d,gain=1.0):
    n=int(SR*d); s=np.zeros(n)
    for m in ms:
        for det in (-0.12,0,0.12): s+=saw(note(m+det),n)
    s=lp(s/len(ms)/3,0.03); x=np.arange(n)/SR
    return s*np.minimum(1,x/1.2)*np.minimum(1,(d-x)/1.5).clip(0)*gain
def bass(m,d):
    n=int(SR*d); s=saw(note(m),n)+0.5*np.sin(2*np.pi*note(m-12)*np.arange(n)/SR)
    return lp(s,0.05)*env(n,0.004,d*0.6)
def impact(d=3.0):
    n=int(SR*d); x=np.arange(n)/SR
    boom=np.sin(2*np.pi*np.cumsum(30+60*np.exp(-x*6))/SR)*np.exp(-x*1.4)
    nz=rng.standard_normal(n); nz=lp(nz,0.08)*np.exp(-x*3)
    return boom+0.6*nz
def riser(d):
    n=int(SR*d); x=np.arange(n)/SR; s=rng.standard_normal(n)
    out=np.empty(n); acc=0.0
    for i in range(n):
        a=0.01+0.4*(x[i]/d)**2; acc+=a*(s[i]-acc); out[i]=acc
    return out*(x/d)**2
# --- arrangement (v2: brighter, plucky arp, A minor) ---------------
beats=lambda a,b:[a+i*BEAT for i in range(int(round((b-a)/BEAT)))]
def pluck(m,d=0.22):
    n=int(SR*d); s=saw(note(m),n)+0.4*saw(note(m+12),n); return lp(s,0.18)*env(n,0.002,0.09)
prog=[(45,[57,60,64]),(41,[53,57,60]),(48,[55,60,64]),(43,[55,59,62])]  # Am F C G, 2s per chord
def arp(a,b,gain):
    for k,bt in enumerate([a+i*BEAT/2 for i in range(int(round((b-a)/(BEAT/2))))]):
        root,ch=prog[int((bt)//2)%4]; add(pluck(ch[k%3]+12*(k%4==3)),bt,gain)
# 0-4 hook: three slams + "one desk"
for bt in (0.5,1.5,2.5): add(kick(0.5),bt,1.0); add(clap(),bt,0.5)
add(pad([57,60,64],4.0,0.4),0); add(riser(0.8),3.2,0.5)
# 4 brand impact
add(impact(),4.0,0.9); add(pad([45,57,60,64],4.2,0.7),4.0); arp(5.0,8.0,0.18)
# 8-18 OPEN: full drive
for bt in beats(8.0,18.0):
    add(kick(),bt,1.0); add(hat(),bt+BEAT/2,0.35)
    root,_=prog[int(bt//2)%4]; add(bass(root,BEAT*0.45),bt+BEAT/2,0.6)
for bt in beats(8.5,18.0)[::2]: add(clap(),bt,0.4)
arp(8.0,18.0,0.22)
# 18-28 REBALANCE: half-time, filtered
add(impact(1.5),18.0,0.5)
for bt in beats(18.0,28.0)[::2]: add(kick(),bt,0.8)
for bt in beats(18.0,28.0): add(hat(0.03),bt+BEAT/2,0.25)
for s in range(18,28,2): root,ch=prog[(s//2)%4]; add(pad(ch,2.2,0.45),s); add(bass(root,1.0),s,0.4)
arp(23.0,28.0,0.12); add(riser(2.0),26.0,0.45)
# 28-37 COMPOUND: drive returns, arp brighter
add(impact(1.5),28.0,0.6)
for bt in beats(28.0,37.0):
    add(kick(),bt,1.0); add(hat(),bt+BEAT/2,0.4); add(hat(0.03),bt+BEAT/4,0.15)
    root,_=prog[int(bt//2)%4]; add(bass(root,BEAT*0.45),bt+BEAT/2,0.6)
for bt in beats(28.5,37.0)[::2]: add(clap(),bt,0.4)
arp(28.0,37.0,0.26); add(riser(1.5),35.5,0.5)
# 37-41 more: stabs on beats
add(impact(1.5),37.0,0.7)
for bt in beats(37.0,41.0): add(kick(0.35),bt,0.7); add(pluck(69,0.3),bt,0.25)
add(riser(1.0),40.0,0.5)
# 41-45 CTA
add(impact(4.0),41.0,1.0); add(pad([45,57,60,64,69],4.0,0.9),41.0)
# --- master ------------------------------------------------------
mix=np.tanh(mix*0.9)
fade=np.minimum(1,np.minimum(t/0.05,(DUR-t)/2.5)).clip(0)
mix=mix*fade; mix=mix/np.max(np.abs(mix))*0.89
st=np.stack([mix,np.roll(mix,int(SR*0.008))*0.97],1)
with wave.open(__file__.replace('make_bgm.py','bgm.wav'),'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st*32767).astype('<i2').tobytes())
print('ok')
