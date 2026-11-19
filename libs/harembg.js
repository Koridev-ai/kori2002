"use strict";

const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const DIR = path.resolve(__dirname, "..", "src", "harembg");
const WIDTH = 480;
const HEIGHT = 860;
const QUALITY = 60;
const MAX_BYTES = 12 * 1024 * 1024;
const CACHE_LIMIT = 100;

const cache = new Map();

function fileFor(id) {
  const safe = String(id).replace(/[^0-9A-Za-z_.-]/g, "_").slice(0, 80);
  return safe ? path.join(DIR, `${safe}.jpg`) : null;
}

function isImage(media) {
  if (!media) return false;
  const mime = String(media.mimetype || "").split(";")[0].toLowerCase();
  if (media.type === "image") return true;
  return media.type === "document" && ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mime);
}

async function save(id, buffer) {
  const file = fileFor(id);
  if (!file) throw new Error("Usuario no válido.");
  const img = await loadImage(buffer);
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  const scale = Math.max(WIDTH / img.width, HEIGHT / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (WIDTH - dw) / 2, (HEIGHT - dh) / 2, dw, dh);
  const out = canvas.toBuffer("image/jpeg", QUALITY);
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(file, out);
  cache.delete(file);
  return out.length;
}

function load(id) {
  const file = fileFor(id);
  if (!file || !fs.existsSync(file)) return null;
  const mtime = fs.statSync(file).mtimeMs;
  const hit = cache.get(file);
  if (hit && hit.mtime === mtime) return hit.uri;
  const uri = `data:image/jpeg;base64,${fs.readFileSync(file).toString("base64")}`;
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(file, { mtime, uri });
  return uri;
}

function remove(id) {
  const file = fileFor(id);
  if (!file || !fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  cache.delete(file);
  return true;
}

module.exports = { MAX_BYTES, isImage, save, load, remove };
