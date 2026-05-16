import { createRequire } from "node:module";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempPlaywrightRoot =
  process.env.PLAYWRIGHT_NODE_MODULES ?? "/tmp/agentguard-playwright/node_modules";
const requireFromPlaywright = createRequire(path.join(tempPlaywrightRoot, "package.json"));
const { chromium } = requireFromPlaywright("playwright");

const width = 1920;
const height = 1080;
const fps = 12;

const visualTimeline = [
  { slideIndex: 0, duration: 20.56 },
  { slideIndex: 1, duration: 29.44 },
  { slideIndex: 3, duration: 32.32 },
  { slideIndex: 4, duration: 45 },
  { slideIndex: 5, duration: 36.142 },
];
const demoSlideIndex = 4;

const htmlPath = path.join(repoRoot, "docs/pitch-deck/index.html");
const demoClipPath = path.join(repoRoot, "docs/demo-clip/agentguard-mvp-demo.mp4");
const voiceoverPath = path.join(repoRoot, "docs/final-video/voiceover.mp3");
const outputDir = path.join(repoRoot, "docs/final-video");
const workDir = path.join(outputDir, "pitch-render-work");
const framesDir = path.join(workDir, "frames");
const clipsDir = path.join(workDir, "clips");
const concatListPath = path.join(workDir, "concat.txt");
const silentVideoPath = path.join(workDir, "pitch-silent.mp4");
const outputPath = path.join(outputDir, "agentguard-pitch-video.mp4");
const pageUrl = `${pathToFileURL(htmlPath).href}?capture=1`;

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function encodeStill(framePath, duration, outputPathForClip) {
  await run("ffmpeg", [
    "-y",
    "-loop",
    "1",
    "-framerate",
    String(fps),
    "-t",
    String(duration),
    "-i",
    framePath,
    "-vf",
    `scale=${width}:${height},format=yuv420p`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(fps),
    outputPathForClip,
  ]);
}

async function normalizeVideo(inputPath, outputPathForClip) {
  await run("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-vf",
    `scale=${width}:${height},fps=${fps},format=yuv420p`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-an",
    outputPathForClip,
  ]);
}

await rm(workDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });
await mkdir(clipsDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--allow-file-access-from-files"],
});

const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.goto(pageUrl);
await page.waitForFunction(() => document.querySelectorAll(".slide").length === 6);

const clipPaths = [];

for (let index = 0; index < visualTimeline.length; index += 1) {
  const item = visualTimeline[index];
  await page.evaluate((slideIndex) => window.agentGuardShowSlide(slideIndex), item.slideIndex);
  const framePath = path.join(framesDir, `slide-${item.slideIndex + 1}.png`);
  await page.screenshot({ path: framePath, fullPage: false });

  const clipPath = path.join(clipsDir, `clip-${String(index + 1).padStart(2, "0")}.mp4`);
  if (item.slideIndex === demoSlideIndex) {
    await normalizeVideo(demoClipPath, clipPath);
  } else {
    await encodeStill(framePath, item.duration, clipPath);
  }
  clipPaths.push(clipPath);
  console.log(`Prepared clip ${index + 1}/${visualTimeline.length}`);
}

await browser.close();

await writeFile(
  concatListPath,
  clipPaths.map((clipPath) => `file '${clipPath.replaceAll("'", "'\\''")}'`).join("\n"),
);

await run("ffmpeg", [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  concatListPath,
  "-c",
  "copy",
  silentVideoPath,
]);

await run("ffmpeg", [
  "-y",
  "-i",
  silentVideoPath,
  "-i",
  voiceoverPath,
  "-map",
  "0:v:0",
  "-map",
  "1:a:0",
  "-c:v",
  "copy",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  "-shortest",
  "-movflags",
  "+faststart",
  outputPath,
]);

if (process.env.KEEP_PITCH_RENDER_WORK !== "1") {
  await rm(workDir, { recursive: true, force: true });
}

console.log(`Rendered ${outputPath}`);
