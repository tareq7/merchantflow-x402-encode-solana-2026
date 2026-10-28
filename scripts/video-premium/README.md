# SellerPilot premium three-minute demo — source

The official film is public/demo-video.mp4: exactly 180.000 seconds, 1920x1080, 24fps, 4,320 frames, H.264 with AAC audio.

Release v0.4.0-cinematic-180s includes the film and sellerpilot-180-production-sources.zip with the 16 source screenshots, original ElevenLabs Eleven v4 voice recording, original music synthesis and scene scripts.

## Reproduce

Install FFmpeg, Python 3.12, Pillow, NumPy and SciPy. Extract the archive into an isolated work directory containing raw/ and audio/narration-eleven-v4.mp3. Export SELLERPILOT_VIDEO_WORKDIR to that path. Run the scripts in sequence:

1. python scripts/video-premium/create_audio.py
2. python scripts/video-premium/design_scenes.py
3. python scripts/video-premium/render_video.py

Reading intervals are inserted at existing speech breaks, retaining the original voice pitch and tempo. Original synthesized ambience and transitions are mixed underneath the ElevenLabs voice. All financial data is synthetic. The server-side live Muse endpoint stays gated. Voice attribution: 11.ai (ElevenLabs).
