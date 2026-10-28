import os
from pathlib import Path
import subprocess,json,time,shutil
P=Path(os.environ.get('SELLERPILOT_VIDEO_WORKDIR',Path(__file__).resolve().parent)).resolve()
M=json.loads((P/'scene-manifest.json').read_text())
bounds=M['boundaries'];fps=M['fps']
assert len(bounds)==19 and abs(bounds[-1]-180)<.0001
frames=[int(round(b*fps)) for b in bounds]
assert frames[0]==0 and frames[-1]==4320,frames
N=[frames[i+1]-frames[i] for i in range(18)]
assert sum(N)==4320 and min(N)>85
clips=P/'clips';clips.mkdir(exist_ok=True)
start=time.monotonic()
for idx,frame_count in enumerate(N,1):
 out=clips/f'{idx:02d}.mp4'
 if out.exists() and out.stat().st_size>30000 and idx==1:print('REUSING',idx,flush=True);continue
 direction=1 if idx%2 else -1
 filt=(f"zoompan=z='min(zoom+0.00015,1.041)':"
       f"x='iw/2-(iw/zoom/2)+{direction*7}*sin(on/64)':"
       f"y='ih/2-(ih/zoom/2)+3*cos(on/53)':"
       f"d=1:s=1920x1080:fps=24,format=yuv420p")
 if idx==1:filt+=",fade=t=in:st=0:d=0.45"
 if idx==18:filt+=f",fade=t=out:st={(frame_count/fps)-1.3:.4f}:d=1.3"
 src=P/'design'/f'{idx:02d}.png'
 args=['ffmpeg','-y','-hide_banner','-loglevel','error','-loop','1',
       '-framerate','24','-i',str(src),'-frames:v',str(frame_count),
       '-vf',filt,'-an','-c:v','libx264','-preset','ultrafast',
       '-crf','20','-pix_fmt','yuv420p','-r','24','-movflags','+faststart',str(out)]
 subprocess.run(args,check=True,timeout=120)
 print('SCENE',idx,'frames',frame_count,'sec',round(frame_count/fps,3),'MB',round(out.stat().st_size/1e6,2),'elapsed',round(time.monotonic()-start,1),flush=True)
playlist=P/'clips'/ 'concat.txt'
playlist.write_text(''.join("file '"+str(clips/f'{i:02d}.mp4')+"'\n" for i in range(1,19)))
silent=P/'sellerpilot-180-video-only.mp4'
subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(playlist),
                '-c','copy','-movflags','+faststart',str(silent)],check=True,timeout=90)
final=P/'SellerPilot-Premium-Exactly-3min.mp4'
subprocess.run(['ffmpeg','-y','-v','error','-i',str(silent),'-i',str(P/'audio/mix-180s.wav'),
 '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k',
 '-ar','48000','-ac','2','-t','180','-metadata','title=SellerPilot AI — A Better Advertising Decision (3-Minute Film)',
 '-metadata','comment=ElevenLabs 11.ai voiceover. Synthetic product demonstration.',
 '-movflags','+faststart',str(final)],check=True,timeout=120)
meta=json.loads(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height,r_frame_rate,nb_frames','-of','json',str(final)],capture_output=True,text=True,check=True).stdout)
duration=float(meta['format']['duration'])
assert abs(duration-180.0)<.001,meta
v=[x for x in meta['streams'] if x['codec_type']=='video'][0]
assert v['width']==1920 and v['height']==1080 and v['r_frame_rate']=='24/1' and int(v['nb_frames'])==4320
print('PREMIUM_MASTER_VERIFIED',json.dumps({'seconds':duration,'sizeMB':round(int(meta['format']['size'])/1e6,2),'video':v,'file':str(final),'walltime':round(time.monotonic()-start,1)}),flush=True)
