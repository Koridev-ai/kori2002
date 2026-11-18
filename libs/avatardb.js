"use strict";

const fs = require("fs");
const path = require("path");
const pdb = require("./profiledb");

const DIR = path.resolve(__dirname, "..", "src", "avatars");
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_SECONDS = 20;

const IMAGE_EXT = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp" };

function describe(media) {
  if (!media) return null;
  const mime = String(media.mimetype || "").split(";")[0].toLowerCase();
  const node = media.node || {};
  if (media.type === "image") {
    return { kind: "image", ext: IMAGE_EXT[mime] || "jpg" };
  }
  if (media.type === "video") {
    if (Number(node.seconds || 0) > MAX_SECONDS) return { error: `El gif o video no puede durar más de ${MAX_SECONDS} segundos.` };
    return { kind: "video", ext: "mp4" };
  }
  if (media.type === "document") {
    if (IMAGE_EXT[mime]) return { kind: "image", ext: IMAGE_EXT[mime] };
    if (mime === "video/mp4") return { kind: "video", ext: "mp4" };
    if (mime === "image/gif") return { error: "Los archivos .gif como documento no se pueden animar. Envíalo como gif o video desde la galería." };
  }
  return null;
}

function remove(jid) {
  const user = pdb.peek(jid);
  if (!user?.avatar?.file) return false;
  const file = path.join(DIR, user.avatar.file);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  pdb.set(jid, "avatar", null);
  return true;
}

function save(jid, buffer, info) {
  fs.mkdirSync(DIR, { recursive: true });
  remove(jid);
  const file = `${pdb.key(jid)}_${Date.now()}.${info.ext}`;
  fs.writeFileSync(path.join(DIR, file), buffer);
  pdb.set(jid, "avatar", { file, kind: info.kind });
  return file;
}

function load(jid) {
  const user = pdb.peek(jid);
  if (!user?.avatar?.file) return null;
  const file = path.join(DIR, user.avatar.file);
  if (!fs.existsSync(file)) return null;
  return { buffer: fs.readFileSync(file), kind: user.avatar.kind };
}

module.exports = { MAX_BYTES, MAX_SECONDS, describe, save, remove, load };
