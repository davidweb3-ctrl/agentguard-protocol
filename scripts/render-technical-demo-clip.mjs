import { createRequire } from "node:module";
import { mkdir, rm } from "node:fs/promises";
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
const durationMs = 43_000;
const frameCount = Math.ceil((durationMs / 1000) * fps);

const htmlPath = path.join(repoRoot, "docs/technical-demo-clip/index.html");
const framesDir = path.join(repoRoot, "docs/technical-demo-clip/frames");
const outputPath = path.join(repoRoot, "docs/technical-demo-clip/agentguard-technical-terminal.mp4");
const pageUrl = `${pathToFileURL(htmlPath).href}?capture=1`;

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

await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--allow-file-access-from-files"],
});

const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.goto(pageUrl);
await page.waitForFunction(() => typeof window.agentGuardRenderAt === "function");

for (let index = 0; index < frameCount; index += 1) {
  const timestampMs = Math.round((index / fps) * 1000);
  await page.evaluate((time) => window.agentGuardRenderAt(time), timestampMs);
  const framePath = path.join(framesDir, `frame-${String(index + 1).padStart(5, "0")}.png`);
  await page.screenshot({ path: framePath, fullPage: false });
  if ((index + 1) % 120 === 0 || index === frameCount - 1) {
    console.log(`Captured ${index + 1}/${frameCount} frames`);
  }
}

await browser.close();

await run("ffmpeg", [
  "-y",
  "-framerate",
  String(fps),
  "-i",
  path.join(framesDir, "frame-%05d.png"),
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  outputPath,
]);

if (process.env.KEEP_TECHNICAL_FRAMES !== "1") {
  await rm(framesDir, { recursive: true, force: true });
}

console.log(`Rendered ${outputPath}`);
