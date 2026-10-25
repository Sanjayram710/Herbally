import subprocess
from pathlib import Path
import cv2
import numpy as np

ffmpeg_path = r"C:\Users\sanja\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe"
assets_dir = Path(r"C:\DM\backend\app\services\video_providers\assets")
assets_dir.mkdir(parents=True, exist_ok=True)


def generate_playable_video(aspect: str = "9:16"):
    w, h = (720, 1280) if aspect == "9:16" else (1280, 720)
    tag = "9_16" if aspect == "9:16" else "16_9"
    raw_mp4 = assets_dir / f"temp_{tag}.mp4"
    out_mp4 = assets_dir / f"demo_playable_{tag}.mp4"

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(raw_mp4), fourcc, 30.0, (w, h))

    num_frames = 90  # 3.0 seconds at 30 fps
    for i in range(num_frames):
        frame = np.zeros((h, w, 3), dtype=np.uint8)
        progress = i / float(num_frames)

        # Dynamic motion
        glow_y = int(h * 0.45 + np.sin(progress * 2 * np.pi) * (h * 0.12))
        glow_x = int(w * 0.5 + np.cos(progress * 2 * np.pi) * (w * 0.1))

        cv2.circle(frame, (glow_x, glow_y), int(min(w, h) * 0.35), (45, 30, 20), -1)
        cv2.circle(frame, (w // 2, h // 2), int(min(w, h) * 0.22), (75, 50, 30), -1)

        # Draw card container
        card_w = int(w * 0.72)
        card_h = int(h * 0.48) if aspect == "9:16" else int(h * 0.65)
        x1, y1 = (w - card_w) // 2, (h - card_h) // 2
        cv2.rectangle(frame, (x1, y1), (x1 + card_w, y1 + card_h), (110, 80, 45), 2)

        # Animated showcase graphic
        pulse_r = int(min(w, h) * 0.1 + 8 * np.sin(progress * 4 * np.pi))
        cv2.circle(frame, (w // 2, h // 2 - 20), pulse_r, (180, 140, 75), -1)

        # Typography
        cv2.putText(frame, "OmniScale AI", (x1 + 24, y1 + 54), cv2.FONT_HERSHEY_DUPLEX, 0.9, (255, 255, 255), 2)
        cv2.putText(frame, "Studio Video Simulation", (x1 + 24, y1 + 92), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (160, 220, 100), 1)
        cv2.putText(frame, f"Format: {aspect}  |  Universal Playback", (x1 + 24, y1 + card_h - 26), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (210, 210, 210), 1)

        writer.write(frame)

    writer.release()

    # Transcode with ffmpeg into standard H.264 MP4 with faststart
    cmd = [
        ffmpeg_path, "-y", "-i", str(raw_mp4),
        "-c:v", "libx264", "-preset", "fast", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(out_mp4)
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if raw_mp4.exists():
        raw_mp4.unlink()
    print(f"Generated {out_mp4.name}: {out_mp4.stat().st_size} bytes")


if __name__ == "__main__":
    generate_playable_video("9:16")
    generate_playable_video("16:9")
