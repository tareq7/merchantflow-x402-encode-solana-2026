import os
from pathlib import Path
import subprocess,json
P=Path(os.environ.get('SELLERPILOT_VIDEO_WORKDIR',Path(__file__).resolve().parent)).resolve()
f1=next(Path('docs/assets').glob('ElevenLabs_2026-10-28T13_46*.mp3'))
f2=next(Path('docs/assets').glob('ElevenLabs_2026-10-28T13_33* (1).mp3'))
def duration(f):
 return float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(f)]))['format']['duration'])
d1=duration(f1);d2=duration(f2)
speed=(d1+d2)/180.0
assert 0.98<speed<1.02,speed
wav=P/'audio/voice-clean-exact-180.wav'
flt=(f'[0:a]aresample=48000,asetpts=PTS-STARTPTS[a];'
     f'[1:a]aresample=48000,asetpts=PTS-STARTPTS[b];'
     f'[a][b]concat=n=2:v=0:a=1,atempo={speed:.9f},highpass=f=65,'
     'loudnorm=I=-16:TP=-1.5:LRA=10,aresample=48000,apad=whole_len=8640000,atrim=end_sample=8640000,asetpts=N/SR/TB[voice]')
args=['ffmpeg','-y','-v','error','-i',str(f1),'-i',str(f2),
      '-filter_complex',flt,'-map','[voice]','-ac','1','-ar','48000',
      '-c:a','pcm_s16le',str(wav)]
subprocess.run(args,check=True,timeout=120)
result=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration,size:stream=sample_rate,channels','-of','json',str(wav)]))
seconds=float(result['format']['duration'])
assert seconds==180.0,seconds
print('VOICE_MASTER',json.dumps({'original_intro':d1,'original_main':d2,'total_before':d1+d2,'atempo_factor':speed,'exact_duration':seconds,'file_mb':round(wav.stat().st_size/1e6,2),'streams':result['streams']}),flush=True)
