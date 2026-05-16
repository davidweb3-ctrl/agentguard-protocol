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
const maxDuration = 154;
const audioTempo = 1;

const segments = [
  { type: "slide", slide: 0, duration: 46 },
  { type: "slide", slide: 1, duration: 19 },
  { type: "slide", slide: 2, duration: 19 },
  { type: "slide", slide: 3, duration: 4 },
  { type: "terminal" },
  { type: "slide", slide: 4, duration: 8 },
  { type: "slide", slide: 5, duration: 15 },
];

const deckPath = path.join(repoRoot, "docs/technical-deck/index.html");
const terminalClipPath = path.join(
  repoRoot,
  "docs/technical-demo-clip/agentguard-technical-terminal.mp4",
);
const voiceoverPath = path.join(repoRoot, "docs/final-video/technical-voiceover.mp3");
const outputDir = path.join(repoRoot, "docs/final-video");
const workDir = path.join(outputDir, "technical-render-work");
const framesDir = path.join(workDir, "frames");
const clipsDir = path.join(workDir, "clips");
const concatListPath = path.join(workDir, "concat.txt");
const silentVideoPath = path.join(workDir, "technical-silent.mp4");
const trimmedAudioPath = path.join(workDir, "technical-voiceover-trimmed.m4a");
const outputPath = path.join(outputDir, "agentguard-technical-video.mp4");
const pageUrl = `${pathToFileURL(deckPath).href}?capture=1`;

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
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
await page.waitForFunction(() => typeof window.agentGuardShowSlide === "function");

const clipPaths = [];

for (let index = 0; index < segments.length; index += 1) {
  const segment = segments[index];
  const clipPath = path.join(clipsDir, `clip-${String(index + 1).padStart(2, "0")}.mp4`);

  if (segment.type === "terminal") {
    await normalizeVideo(terminalClipPath, clipPath);
  } else {
    await page.evaluate((slideIndex) => window.agentGuardShowSlide(slideIndex), segment.slide);
    const framePath = path.join(framesDir, `slide-${index + 1}.png`);
    await page.screenshot({ path: framePath, fullPage: false });
    await encodeStill(framePath, segment.duration, clipPath);
  }

  clipPaths.push(clipPath);
  console.log(`Prepared segment ${index + 1}/${segments.length}`);
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
  voiceoverPath,
  "-af",
  `atempo=${audioTempo}`,
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  trimmedAudioPath,
]);

await run("ffmpeg", [
  "-y",
  "-i",
  silentVideoPath,
  "-i",
  trimmedAudioPath,
  "-t",
  String(maxDuration),
  "-map",
  "0:v:0",
  "-map",
  "1:a:0",
  "-c:v",
  "copy",
  "-c:a",
  "copy",
  "-shortest",
  "-movflags",
  "+faststart",
  outputPath,
]);

if (process.env.KEEP_TECHNICAL_RENDER_WORK !== "1") {
  await rm(workDir, { recursive: true, force: true });
}

console.log(`Rendered ${outputPath}`);
