import os
from pathlib import Path
import subprocess,json,math
import numpy as np
from scipy.io import wavfile
P=Path(os.environ.get('SELLERPILOT_VIDEO_WORKDIR',Path(__file__).resolve().parent)).resolve()
SR=48000
TOTAL=180
cuts=[5.91,13.30,21.43,27.72,34.95,42.18,49.50,56.35,63.99,72.48,77.79,83.14,91.69,98.60,103.18]
intro,outro=6.0,7.5
probe=json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(P/'audio/narration-eleven-v4.mp3')],capture_output=True,text=True,check=True).stdout)
voicedur=float(probe['format']['duration'])
gapsize=(TOTAL-intro-outro-voicedur)/len(cuts)
raw=subprocess.run(['ffmpeg','-v','error','-i',str(P/'audio/narration-eleven-v4.mp3'),'-f','f32le','-ar',str(SR),'-ac','1','pipe:1'],capture_output=True,check=True).stdout
voice=np.frombuffer(raw,dtype='<f4')
length=SR*TOTAL
ncut=[int(round(x*SR)) for x in cuts]
nvoice=len(voice)
nintro=int(round(intro*SR))
ngap=[int(round(gapsize*SR)) for _ in cuts]
nv=np.zeros(length,dtype=np.float32)
segments=[]
dst=nintro
for i,(a,b) in enumerate(zip([0]+ncut,ncut+[nvoice])):
 count=b-a
 if dst+count>length:raise RuntimeError('voice overflow')
 chunk=np.array(voice[a:b],copy=True)
 nfade=min(int(.045*SR),count//4)
 if nfade:
  chunk[:nfade]*=np.linspace(0,1,nfade)
  chunk[-nfade:]*=np.linspace(1,0,nfade)
 nv[dst:dst+count]+=chunk
 segments.append({'scene':i+1,'originalStart':round(a/SR,3),'originalEnd':round(b/SR,3),'start':round(dst/SR,3),'speechEnd':round((dst+count)/SR,3)})
 dst+=count
 if i<len(cuts):dst+=ngap[i]
# Final voice ends at 172.5s; last 7.5s is a real visual outro.
assert abs(dst/SR-(TOTAL-outro))<.08,(dst/SR,TOTAL-outro)
scene_boundaries=[0,intro]+[s['start'] for s in segments[1:]]+[dst/SR,TOTAL]
assert len(scene_boundaries)==19
# Original composition: restrained, evolving ambient electronic score; no sampled copyrighted recordings.
music=np.zeros((length,2),dtype=np.float32)
roots=[110.,146.83,98.,123.47,130.81,110.,164.81,123.47,110.,146.83,98.,123.47,130.81,110.,164.81,123.47]
CHORD_DUR=12
for i,start in enumerate(range(0,TOTAL,CHORD_DUR)):
 end=min(TOTAL,start+CHORD_DUR)
 n=(end-start)*SR
 tt=np.arange(n,dtype=np.float32)/SR
 root=roots[i%len(roots)]
 # Soft chorused pad with 5th and octave, slow intra-chord beating.
 tones=(np.sin(2*np.pi*root*tt)+.46*np.sin(2*np.pi*root*1.4983*tt+.4)+.29*np.sin(2*np.pi*root*2*tt+1)+.17*np.sin(2*np.pi*root*.5*tt))
 trem=(.73+.27*np.sin(2*np.pi*.092*tt+1.2))
 env=np.minimum(1.,tt/1.55)*np.minimum(1.,(end-start-tt)/1.4)
 pad=tones*trem*env*0.034
 x=start*SR
 music[x:x+n,0]+=pad*(1+.05*np.sin(2*np.pi*.17*tt))
 music[x:x+n,1]+=pad*(1-.05*np.sin(2*np.pi*.17*tt))
 # Subtle non-drum rhythmic pulse / light kinetic underscore.
 for beat in np.arange(.2,end-start,2.0):
  v=int(beat*SR)
  m=min(int(.55*SR),n-v)
  if m<=0:continue
  u=np.arange(m)/SR
  pulse=np.sin(2*np.pi*(root*.5)*u)*np.exp(-u*11)*.012
  music[x+v:x+v+m,:]+=pulse[:,None]
# Quiet airy sweeps marking the genuine shot transitions.
rng=np.random.default_rng(8471)
for q,tm in enumerate(scene_boundaries[1:-1]):
 center=int(tm*SR)
 m=int(.38*SR)
 s=max(0,center-m//2)
 e=min(length,s+m)
 w=np.arange(e-s,dtype=np.float32)/SR
 noise=rng.standard_normal(e-s).astype(np.float32)
 noise=np.convolve(noise,np.ones(28,dtype=np.float32)/28,'same')
 envelope=np.sin(np.linspace(0,np.pi,e-s,dtype=np.float32))**2
 sweep=noise*envelope*.020
 music[s:e,0]+=sweep
 music[s:e,1]+=.82*sweep
# Music ducks beneath spoken lines and rises gently during reading holds.
duck=np.full(length,.86,dtype=np.float32)
for s in segments:
 a=max(0,int((s['start']-.22)*SR))
 b=min(length,int((s['speechEnd']+.22)*SR))
 duck[a:b]=.29
# Envelope smoothing prevents pumping near cuts.
window=int(.22*SR)
smooth=np.convolve(np.ones(window,dtype=np.float32)/window,duck[:SR*5],mode='same')
# Full vector convolution is avoidable: one-pole smoothing, scipy low pass.
from scipy.signal import lfilter
duck=lfilter([1/float(window)],[1,-(1-1/float(window))],duck).astype(np.float32)
duck=np.clip(duck,.25,.9)
music*=duck[:,None]
stereo=np.stack([nv,nv],axis=1)
mixed=stereo*.91+music
peak=np.max(np.abs(mixed))
if peak>.95:mixed*=.95/peak
wavfile.write(str(P/'audio/mix-180s.wav'),SR,mixed.astype(np.float32))
(P/'scene-manifest.json').write_text(json.dumps({'duration':TOTAL,'fps':24,'sampleRate':SR,'intro':intro,'outro':outro,'gapSizeSeconds':round(gapsize,6),'scenes':segments,'boundaries':[round(x,4) for x in scene_boundaries]},indent=2))
print('AUDIO_READY',json.dumps({'seconds':TOTAL,'sourceVoice':round(voicedur,3),'gapBetweenPhrases':round(gapsize,3),'voiceEnds':round(dst/SR,3),'scenes':len(scene_boundaries)-1,'peak':round(float(peak),3),'fileSizeMB':round((P/'audio/mix-180s.wav').stat().st_size/1e6,1)}),flush=True)
