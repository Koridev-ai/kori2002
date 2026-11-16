"use strict";

const fs = require("fs");
const path = require("path");
const dns = require("dns").promises;
const net = require("net");
const axios = require("axios");
const kit = require("./pluginkit");

const ROOT = path.resolve(__dirname, "..", "media", "subs");
const KINDS = ["banner", "icon", "pfp"];
const MAX_BYTES = 5 * 1024 * 1024;

function detect(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

function dirOf(id) {
  const key = String(id || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
  if (!key) throw new Error("Id de bot inválido.");
  return path.join(ROOT, key);
}

function file(id, kind) {
  if (!KINDS.includes(kind)) return null;
  let dir;
  try {
    dir = dirOf(id);
  } catch {
    return null;
  }
  if (!fs.existsSync(dir)) return null;
  const found = fs.readdirSync(dir).find((name) => name.startsWith(`${kind}.`));
  return found ? path.join(dir, found) : null;
}

function read(id, kind) {
  const target = file(id, kind);
  if (!target) return null;
  try {
    return fs.readFileSync(target);
  } catch {
    return null;
  }
}

function bannerBuffer(id) {
  return read(id, "banner") || read(id, "icon");
}

function bannerImage(id, fallbackFile) {
  const buffer = bannerBuffer(id);
  if (buffer) return { image: buffer, mimetype: (detect(buffer) || { mime: "image/jpeg" }).mime };
  return { image: fs.readFileSync(fallbackFile), mimetype: "image/jpeg" };
}

function remove(id, kind) {
  const target = file(id, kind);
  if (target) fs.rmSync(target, { force: true });
}

function removeAll(id) {
  try {
    fs.rmSync(dirOf(id), { recursive: true, force: true });
  } catch {}
}

function save(id, kind, buffer) {
  if (!KINDS.includes(kind)) throw new Error("Tipo de imagen no válido.");
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error("La imagen está vacía.");
  if (buffer.length > MAX_BYTES) throw new Error("La imagen supera el límite de 5 MB.");
  const type = detect(buffer);
  if (!type) throw new Error("Formato no soportado. Usa JPG, PNG o WEBP.");
  const dir = dirOf(id);
  fs.mkdirSync(dir, { recursive: true });
  remove(id, kind);
  const target = path.join(dir, `${kind}.${type.ext}`);
  fs.writeFileSync(target, buffer);
  return { path: target, ...type, size: buffer.length };
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  if (net.isIPv6(address)) {
    const lower = address.toLowerCase();
    return lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80") || lower.startsWith("::ffff:");
  }
  return true;
}

async function download(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("El enlace no es válido.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Solo se permiten enlaces http o https.");
  const records = await dns.lookup(parsed.hostname, { all: true }).catch(() => []);
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) throw new Error("El enlace no es accesible.");
  const response = await axios.get(parsed.toString(), {
    responseType: "arraybuffer",
    timeout: 15000,
    maxRedirects: 0,
    maxContentLength: MAX_BYTES,
    maxBodyLength: MAX_BYTES,
    validateStatus: (status) => status === 200
  });
  return Buffer.from(response.data);
}

async function acquire(msg, args) {
  const url = (args || []).find((arg) => /^https?:\/\//i.test(arg));
  if (url) return download(url);
  const source = kit.getSource(msg);
  const media = kit.getMedia(source);
  if (!media || media.type !== "image") return null;
  return kit.downloadMedia(media);
}

module.exports = { KINDS, MAX_BYTES, detect, file, read, bannerBuffer, bannerImage, save, remove, removeAll, acquire, download };
