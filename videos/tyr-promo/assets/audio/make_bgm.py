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
# --- arrangement -------------------------------------------------
beats=lambda a,b:[a+i*BEAT for i in range(int(round((b-a)/BEAT)))]
# 0-5 hook: drone + a hit on each slam word (every beat from 0.5)
add(pad([38,45],5.2,0.5),0)
for b in beats(0.5,4.5): add(kick(0.3),b,0.8); add(hat(),b+BEAT/2,0.25)
add(riser(1.0),4.0,0.5)
# 5 reveal impact + pad
add(impact(),5.0,0.9)
add(pad([50,53,57],5.5,0.8),5.0)
for b in beats(7.0,10.0): add(hat(),b+BEAT/2,0.2)
# 10-30 drive: four-on-floor, offbeat bass, 8th hats, clap on 2 and 4
prog=[38,38,34,36]  # D D Bb C (bars of 2s)
for b in beats(10.0,30.0):
    add(kick(),b,1.0); add(hat(),b+BEAT/2,0.35); add(hat(0.03),b+BEAT/4,0.12)
    bar=int((b-10)//2)%4; add(bass(prog[bar]+12,BEAT*0.45),b+BEAT/2,0.55)
for b in beats(10.5,30.0)[::2]: add(clap(),b,0.35)
for i,s in enumerate(range(10,30,4)): add(pad([50,53,57] if i%2==0 else [46,50,53],4.2,0.45),s)
add(riser(2.0),28.0,0.45)
# 30-38 trust: drop the kick, heartbeat pulse, tension pad
add(impact(2.0),30.0,0.6)
add(pad([50,53,56],8.2,0.6),30.0)
for b in beats(30.0,36.0)[::2]: add(kick(0.25),b,0.5); add(kick(0.25),b+0.25,0.3)
for b in beats(36.0,38.0): add(kick(),b,0.9); add(hat(),b+BEAT/2,0.3)
add(riser(2.0),36.0,0.55)
# 38 CTA: impact, resolve chord, ring out
add(impact(4.0),38.0,1.0)
add(pad([38,50,53,57,62],7.0,0.9),38.0)
for b in beats(38.0,42.0): add(kick(0.3),b,0.45)
# --- master ------------------------------------------------------
mix=np.tanh(mix*0.9)
fade=np.minimum(1,np.minimum(t/0.05,(DUR-t)/2.5)).clip(0)
mix=mix*fade; mix=mix/np.max(np.abs(mix))*0.89
st=np.stack([mix,np.roll(mix,int(SR*0.008))*0.97],1)
with wave.open(__file__.replace('make_bgm.py','bgm.wav'),'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((st*32767).astype('<i2').tobytes())
print('ok')
