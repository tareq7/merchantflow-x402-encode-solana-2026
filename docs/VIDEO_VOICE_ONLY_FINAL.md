# SellerPilot AI — voice-only final hackathon film

**Released:** October 28, 2026  
**Video:** https://sellerpilot-ai-phi.vercel.app/demo-video.mp4  
**Voiceover only:** https://sellerpilot-ai-phi.vercel.app/demo-voiceover.mp3  
**Release:** https://github.com/tareq7/sellerpilot-ai/releases/tag/v0.5.0-clean-voice

## Exact specifications

- 180.000 seconds, H.264 1920 × 1080, 24fps, 4,320 frames; one mono AAC 48 kHz audio stream.
- Only ElevenLabs Eleven v4 narration. No music, sound effects, transition sounds or background ambience.
- An original 29.152625-second spoken introduction and a separate 150.204063-second main narration were joined. A pitch-preserving 0.3574% timing adjustment yields exactly 8,640,000 PCM samples at 48 kHz (3:00) with no silent opening.
- Color-framed source screenshots retain their original aspect ratios. The compositing defects that previously hid the intro and outro title graphics have been corrected.
- No LLM chat scene. Figures shown are synthetic. Product operations, read-only controls and the model API limitations remain accurately described.
- Voice attribution: 11.ai (ElevenLabs).

## Quality verification

- FFprobe exact 180.000000-second container duration and exactly 4,320 decoded H.264 frames.
- One mono audio stream; no other audio stems or music.
- No silence detected in the first or last seconds of the finished narration.
- No unintended black intervals or lost opening/closing title layers; opening, middle UI and closing frames visually inspected.
- The deployed MP4 checksum is verified against this master after publishing.

## Sources

[Python and FFmpeg production pipeline](../scripts/video-clean-v5/README.md). The full source-media archive, clean standalone voiceover, poster and video are in the GitHub release.
