// Turns the 4:5 post visuals into 1080x1920 Shorts: the visual sits near the
// top on a blurred, darkened copy of itself (bottom ~400 px stays clear of the
// Shorts caption overlay), slow 3% zoom over 8 s, fade in/out, silent AAC.
// Usage: node make-shorts.cjs <outDir>
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const SRC = path.resolve(__dirname, "../facebook/gorseller");
const OUT = path.resolve(process.argv[2] || path.join(__dirname, "shorts"));
fs.mkdirSync(OUT, { recursive: true });

const ITEMS = [
  "08-hangisi.png",
  "04-havalimani-teslim.png",
  "10-kampanya-otomatik-egea-4x5.png",
  "03-uzun-donem-kiralama.png",
  "06-kiralama-sartlari.png",
  "05-transit-cift-kabin.png",
  "07-kurumsal-kiralama.png",
  "11-kampanya-myvista-4x5.png",
  "09-calisma-saatleri.png",
];

const D = 8, FPS = 30, N = D * FPS;
for (const file of ITEMS) {
  const inp = path.join(SRC, file);
  const out = path.join(OUT, "short-" + file.replace(/(-4x5)?\.png$/, ".mp4"));
  const filter =
    `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:6,eq=brightness=-0.18[bg];` +
    `[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:160,` +
    `scale=2160:3840,zoompan=z='1+0.03*on/${N}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=${FPS},` +
    `fade=t=in:st=0:d=0.4,fade=t=out:st=${D - 0.4}:d=0.4,format=yuv420p[v]`;
  execFileSync("ffmpeg", [
    "-y", "-loop", "1", "-framerate", String(FPS), "-t", String(D), "-i", inp,
    "-f", "lavfi", "-t", String(D), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-filter_complex", filter, "-map", "[v]", "-map", "1:a",
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out,
  ], { stdio: ["ignore", "ignore", "pipe"] });
  console.log(path.basename(out), Math.round(fs.statSync(out).size / 1024) + "KB");
}
