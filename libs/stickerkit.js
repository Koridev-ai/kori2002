"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");
const webp = require("node-webpmux");

const SRC_DIR = path.join(__dirname, "..", "src");
const PACKS_FILE = path.join(SRC_DIR, "stickerpacks.json");
const META_FILE = path.join(SRC_DIR, "stickermeta.json");
const TMP_DIR = path.join(os.tmpdir(), "kori-stickers");
const EXIF_HEADER = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);

fs.mkdirSync(TMP_DIR, { recursive: true });
fs.mkdirSync(SRC_DIR, { recursive: true });

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function tmpPath(ext) {
  return path.join(TMP_DIR, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`);
}

function removeFiles(...files) {
  for (const file of files) {
    try {
      fs.unlinkSync(file);
    } catch {}
  }
}

function runFfmpeg(args, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {}
      reject(new Error("ffmpeg timeout"));
    }, timeoutMs);
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      code === 0 ? resolve(true) : reject(new Error(stderr.split("\n").slice(-4).join(" ").trim() || `ffmpeg salió con código ${code}`));
    });
  });
}

const BASE_FILTER = "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=yuva420p";

async function encodeWebp(buffer, { ext = "png", filter = BASE_FILTER, animated = false, quality = 70 } = {}) {
  const input = tmpPath(ext);
  const output = tmpPath("webp");
  fs.writeFileSync(input, buffer);
  try {
    const args = ["-y", "-i", input, "-vf", filter, "-an"];
    if (animated) {
      args.push("-c:v", "libwebp_anim", "-preset", "picture", "-compression_level", "6", "-q:v", String(quality), "-loop", "0", "-t", "10");
    } else {
      args.push("-frames:v", "1", "-c:v", "libwebp", "-lossless", "0", "-compression_level", "6", "-q:v", String(quality));
    }
    args.push(output);
    await runFfmpeg(args);
    return fs.readFileSync(output);
  } finally {
    removeFiles(input, output);
  }
}

async function addExif(webpBuffer, packname, author, emojis = [""]) {
  const img = new webp.Image();
  const json = {
    "sticker-pack-id": crypto.randomBytes(16).toString("hex"),
    "sticker-pack-name": packname,
    "sticker-pack-publisher": author,
    emojis
  };
  const jsonBuffer = Buffer.from(JSON.stringify(json), "utf-8");
  const exif = Buffer.concat([EXIF_HEADER, jsonBuffer]);
  exif.writeUIntLE(jsonBuffer.length, 14, 4);
  await img.load(webpBuffer);
  img.exif = exif;
  return img.save(null);
}

function isAnimatedWebp(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 32) return false;
  return buffer.indexOf(Buffer.from("ANIM")) !== -1 || buffer.indexOf(Buffer.from("ANMF")) !== -1;
}

function senderJid(msg) {
  return msg.key.participant || msg.key.remoteJid;
}

function userKey(ctx, msg) {
  return String(ctx.sender || senderJid(msg)).replace(/[^0-9]/g, "");
}

function getMeta(key) {
  const all = readJson(META_FILE, {});
  return all[key] || { pack: "", author: "" };
}

function setMeta(key, pack, author) {
  const all = readJson(META_FILE, {});
  all[key] = { pack, author };
  writeJson(META_FILE, all);
}

function delMeta(key) {
  const all = readJson(META_FILE, {});
  delete all[key];
  writeJson(META_FILE, all);
}

function resolveMeta(sock, msg, ctx) {
  const meta = getMeta(userKey(ctx, msg));
  const username = msg.pushName || userKey(ctx, msg);
  const botName = sock.user?.name || "Rem";
  const pack = meta.pack ? String(meta.pack).trim() : "";
  const author = meta.author ? String(meta.author).trim() : "";
  if (pack) return { packname: pack, author, custom: true };
  return { packname: botName, author: `@${username}`, custom: false };
}

async function sendWithMeta(sock, msg, ctx, webpBuffer) {
  const meta = resolveMeta(sock, msg, ctx);
  const finalBuffer = await addExif(webpBuffer, meta.packname, meta.author, [""]);
  return sock.sendMessage(msg.key.remoteJid, { sticker: finalBuffer }, { quoted: msg });
}

function loadAllPacks() {
  return readJson(PACKS_FILE, {});
}

function getUserPacks(key) {
  const all = loadAllPacks();
  return Array.isArray(all[key]) ? all[key] : [];
}

function saveUserPacks(key, packs) {
  const all = loadAllPacks();
  all[key] = packs;
  writeJson(PACKS_FILE, all);
}

function findPack(packs, name) {
  const wanted = String(name).trim().toLowerCase();
  return packs.find((p) => p.name.toLowerCase() === wanted);
}

function findPublicPack(name) {
  const wanted = String(name).trim().toLowerCase();
  const all = loadAllPacks();
  for (const [owner, packs] of Object.entries(all)) {
    const pack = (packs || []).find((p) => p.name.toLowerCase() === wanted && p.spackpublic === 1);
    if (pack) return { pack, owner };
  }
  return null;
}

async function sendStickerPackOrFallback(sock, chatId, msg, stickerPack, fallbackItems, packname, author, limit = 10) {
  try {
    await sock.sendMessage(chatId, { stickerPack }, { quoted: msg });
    return "pack";
  } catch {
    let sent = 0;
    for (const item of fallbackItems.slice(0, limit)) {
      const buffer = Buffer.isBuffer(item) ? item : null;
      if (!buffer) continue;
      const finalBuffer = await addExif(buffer, packname, author, ["🎭"]).catch(() => buffer);
      await sock.sendMessage(chatId, { sticker: finalBuffer }, { quoted: msg });
      sent++;
    }
    return sent ? "individual" : "none";
  }
}

module.exports = {
  tmpPath,
  removeFiles,
  runFfmpeg,
  encodeWebp,
  addExif,
  isAnimatedWebp,
  senderJid,
  userKey,
  getMeta,
  setMeta,
  delMeta,
  resolveMeta,
  sendWithMeta,
  getUserPacks,
  saveUserPacks,
  findPack,
  findPublicPack,
  loadAllPacks,
  sendStickerPackOrFallback,
  BASE_FILTER
};
