"use strict";

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { createCanvas } = require("@napi-rs/canvas");
const sk = require("./stickerkit");

const BRAT_API = "https://skyzxu-brat.hf.space";
const SIZE = 512;
const PAD = 30;
const BACKGROUND = "#8ACF00";
const FONT_FAMILY = "sans-serif";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchBuffer(endpoint, text, attempt = 1) {
  try {
    const res = await axios.get(`${BRAT_API}/${endpoint}`, {
      params: { text },
      responseType: "arraybuffer",
      timeout: 45000
    });
    if (!res.data || !res.data.length) throw new Error("Respuesta vacía de la API");
    return Buffer.from(res.data);
  } catch (error) {
    if (error.response?.status === 429 && attempt <= 3) {
      await delay((error.response.headers["retry-after"] || 5) * 1000);
      return fetchBuffer(endpoint, text, attempt + 1);
    }
    throw error;
  }
}

function layout(text) {
  const probe = createCanvas(SIZE, SIZE).getContext("2d");
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const maxWidth = SIZE - PAD * 2;
  let fontSize = 190;
  let lines = [];
  for (; fontSize >= 20; fontSize -= 4) {
    probe.font = `${fontSize}px ${FONT_FAMILY}`;
    lines = [];
    let current = [];
    for (const word of words) {
      const candidate = [...current, word].join(" ");
      if (current.length && probe.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = [word];
      } else {
        current.push(word);
      }
    }
    if (current.length) lines.push(current);
    const widest = Math.max(...lines.map((line) => probe.measureText(line.join(" ")).width));
    const height = lines.length * fontSize * 1.05;
    if (widest <= maxWidth && height <= SIZE - PAD * 2) break;
  }
  return { lines, fontSize, words };
}

function render(layoutData, visibleWords) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  ctx.font = `${layoutData.fontSize}px ${FONT_FAMILY}`;
  const spaceWidth = ctx.measureText(" ").width;
  let count = 0;
  layoutData.lines.forEach((line, index) => {
    const y = PAD + index * layoutData.fontSize * 1.05;
    let x = PAD;
    for (const word of line) {
      count++;
      if (count <= visibleWords) ctx.fillText(word, x, y);
      x += ctx.measureText(word).width + spaceWidth;
    }
  });
  return canvas.toBuffer("image/png");
}

function renderStatic(text) {
  const data = layout(text);
  return render(data, data.words.length);
}

async function staticWebp(text) {
  let source;
  let ext = "webp";
  try {
    source = await fetchBuffer("brat", text);
  } catch {
    source = renderStatic(text);
    ext = "png";
  }
  return sk.encodeWebp(source, { ext });
}

async function animatedFromLocal(text) {
  const data = layout(text);
  const dir = path.join(path.dirname(sk.tmpPath("x")), `brat-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  const output = sk.tmpPath("webp");
  try {
    const total = data.words.length;
    for (let i = 1; i <= total; i++) {
      fs.writeFileSync(path.join(dir, `f${String(i).padStart(3, "0")}.png`), render(data, i));
    }
    const holdFrames = 3;
    for (let i = 1; i <= holdFrames; i++) {
      fs.writeFileSync(path.join(dir, `f${String(total + i).padStart(3, "0")}.png`), render(data, total));
    }
    await sk.runFfmpeg([
      "-y",
      "-framerate",
      "2",
      "-i",
      path.join(dir, "f%03d.png"),
      "-vf",
      "format=yuva420p",
      "-an",
      "-c:v",
      "libwebp_anim",
      "-q:v",
      "60",
      "-loop",
      "0",
      output
    ]);
    return fs.readFileSync(output);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    sk.removeFiles(output);
  }
}

async function animatedWebp(text) {
  try {
    const video = await fetchBuffer("brat-animated", text);
    return await sk.encodeWebp(video, { ext: "mp4", animated: true, quality: 55 });
  } catch {
    return animatedFromLocal(text);
  }
}

module.exports = { staticWebp, animatedWebp };
