# Reproducible clean-voice cinematic video (v0.5.0)

A 180.000-second Full-HD SellerPilot film with only ElevenLabs Eleven v4 narration, no soundtrack, no sound effects, no background audio, and no initial silence.

Dependencies: Python 3.12+, Pillow, NumPy, FFmpeg/FFprobe.

The complete source ZIP from the release contains raw/ with authentic 1920px screenshots, voice-sources/ with both original ElevenLabs MP3s, and the production scripts. To regenerate from the cloned repository:

1. Extract source ZIP to a work directory containing raw/ and audio/.
2. Ensure both original ElevenLabs MP3 files are in docs/assets of the repository.
3. Set environment variable SELLERPILOT_VIDEO_WORKDIR to the work directory.
4. Run python scripts/video-clean-v5/make_voice_only.py.
5. Run python scripts/video-clean-v5/design_scenes.py.
6. Run python scripts/video-clean-v5/render_voiceonly.py.

The voice master is exactly 8,640,000 PCM samples at 48 kHz. The video has 18 scenes of 240 frames each at 24fps. The original screen aspect ratios are preserved. The intro/outro image layers are explicitly returned and composited, fixing previously missing title screens. Voice credit: 11.ai (ElevenLabs). Synthetic financial data only; model endpoint remains privately gated.
