import os
from pathlib import Path
import subprocess,json,time
P=Path(os.environ.get('SELLERPILOT_VIDEO_WORKDIR',Path(__file__).resolve().parent)).resolve()
fps=24;N=240;W=1920;H=1080
clips=P/'clips-clean'; clips.mkdir(exist_ok=True)
start=time.monotonic()
for i in range(1,19):
 src=P/'design'/f'{i:02d}.png'
 out=clips/f'{i:02d}.mp4'
 if i not in (1,18) and out.exists() and out.stat().st_size>20000:
  print('REUSING_STABLE_SCENE',i,flush=True)
  continue
 vf=("zoompan=z='min(zoom+0.000058,1.014)':"
     "x='iw/2-(iw/zoom/2)':"
     "y='ih/2-(ih/zoom/2)':"
     "d=1:s=1920x1080:fps=24,format=yuv420p")
 cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-loop','1','-framerate','24',
      '-i',str(src),'-frames:v',str(N),'-vf',vf,'-an','-c:v','libx264',
      '-preset','ultrafast','-crf','19','-pix_fmt','yuv420p','-r','24',
      '-movflags','+faststart',str(out)]
 subprocess.run(cmd,check=True,timeout=120)
 print('SCENE_OK',i,'10.000sec',round(out.stat().st_size/1e6,2),'MB',round(time.monotonic()-start,1),'s',flush=True)
 playlist=clips/'concat.txt'
playlist.write_text(''.join("file '"+str(clips/f'{i:02d}.mp4')+"'\n" for i in range(1,19)))
video=P/'silent-master-180.mp4'
subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(playlist),
                '-c','copy','-movflags','+faststart',str(video)],check=True,timeout=120)
audio=P/'audio/voice-clean-exact-180.wav'
final=P/'SellerPilot-CleanVoice-Exactly-3min.mp4'
subprocess.run(['ffmpeg','-y','-v','error','-i',str(video),'-i',str(audio),
 '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k',
 '-ar','48000','-ac','1','-t','180','-metadata','title=SellerPilot AI — Clean Voice-Only Three-Minute Film',
 '-metadata','comment=Voice: ElevenLabs 11.ai Eleven v4 Mark. No background music or sound effects.',
 '-movflags','+faststart',str(final)],check=True,timeout=125)
meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height,nb_frames,r_frame_rate,sample_rate,channels','-of','json',str(final)]))
dur=float(meta['format']['duration'])
v=[s for s in meta['streams'] if s['codec_type']=='video'][0]
a=[s for s in meta['streams'] if s['codec_type']=='audio'][0]
assert abs(dur-180.0)<0.002,dur
assert v['nb_frames']=='4320' and v['width']==1920 and v['height']==1080 and v['r_frame_rate']=='24/1',v
assert a['channels']==1 and a['codec_name']=='aac',a
print('FINISHED',json.dumps({'duration':dur,'megabytes':round(final.stat().st_size/1e6,2),'video':v,'audio':a,'wallSeconds':round(time.monotonic()-start,2),'file':str(final)}),flush=True)
