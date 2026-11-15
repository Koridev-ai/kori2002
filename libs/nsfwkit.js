"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const axios = require("axios");
const { spawn } = require("child_process");
const kit = require("./pluginkit");
const pdb = require("./profiledb");
const lid = require("./lid");

const FILE = path.resolve(__dirname, "..", "src", "nsfw.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const MEDIA_EXT = ["jpg", "jpeg", "png", "gif", "mp4", "webm", "webp"];
const BLOCKED_TAGS = new Set([
  "loli", "lolicon", "shota", "shotacon", "child", "children", "toddler", "toddlercon", "underage",
  "preteen", "prepubescent", "infant", "baby", "minor", "aged_down", "age_regression", "kindergarten", "school_age"
]);

let store = null;

function load() {
  if (store) return store;
  try {
    store = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf-8")) : {};
  } catch {
    store = {};
  }
  return store;
}

function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(load(), null, 2));
}

function isEnabled(chatId) {
  return load()[chatId] === true;
}

function setEnabled(chatId, value) {
  const db = load();
  if (value) db[chatId] = true;
  else delete db[chatId];
  save();
}

async function isAdmin(sock, msg) {
  const chatId = msg.key.remoteJid;
  if (!chatId.endsWith("@g.us") || (msg.key.fromMe && !msg.__sub)) return true;
  const meta = await sock.groupMetadata(chatId).catch(() => null);
  if (!meta) return false;
  const mine = [msg.key.participant, msg.key.participantAlt, pdb.selfJid(msg), pdb.rawSelfJid(msg)]
    .filter(Boolean)
    .map((jid) => lid.user(jid));
  return meta.participants.some((p) => {
    if (!p.admin) return false;
    const ids = [p.id, p.lid, p.phoneNumber, p.jid].filter(Boolean).map((jid) => lid.user(jid));
    return ids.some((id) => mine.includes(id));
  });
}

function disabledText(usedPrefix) {
  return `ꕥ El contenido *NSFW* está desactivado en este chat.\n\nUn *administrador* puede activarlo con el comando:\n» *${usedPrefix}nsfw on*`;
}

function isBlockedQuery(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[\s,+]+/)
    .filter(Boolean)
    .some((token) => BLOCKED_TAGS.has(token) || /loli|shota/.test(token));
}

function isFlagged(tagString) {
  return String(tagString || "")
    .toLowerCase()
    .split(/\s+/)
    .some((token) => BLOCKED_TAGS.has(token) || /loli|shota/.test(token));
}

function extOf(url) {
  const match = String(url || "").split("?")[0].match(/\.([a-z0-9]{3,4})$/i);
  return match ? match[1].toLowerCase() : "";
}

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function getJson(url, params, headers = {}) {
  const res = await axios.get(url, {
    params,
    headers: { "User-Agent": UA, Accept: "application/json", ...headers },
    timeout: 15000
  });
  return res.data;
}

async function getText(url, headers = {}) {
  const res = await axios.get(url, {
    headers: { "User-Agent": UA, ...headers },
    timeout: 20000,
    responseType: "text",
    transformResponse: (data) => data
  });
  return res.data;
}

async function getBuffer(url, referer) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    headers: { "User-Agent": UA, ...(referer ? { Referer: referer } : {}) },
    timeout: 45000,
    maxContentLength: 60 * 1024 * 1024,
    maxBodyLength: 60 * 1024 * 1024
  });
  return Buffer.from(res.data);
}

function normalize(items, { ext, getUrl, getTags, getRating, extra }) {
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const url = getUrl(item);
    if (typeof url !== "string" || !url.startsWith("http")) continue;
    const kind = ext ? ext(item, url) : extOf(url);
    if (!MEDIA_EXT.includes(kind)) continue;
    const tags = getTags(item);
    if (isFlagged(tags)) continue;
    const rating = String(getRating(item) || "").toLowerCase();
    if (!["e", "q"].includes(rating[0])) continue;
    out.push({ url, ext: kind, referer: extra?.referer });
  }
  return out;
}

async function fromDanbooru(tags, animated) {
  const first = tags[0] || "";
  const attempts = animated ? [`${first} animated`] : [`${first} rating:explicit`, `${first} rating:questionable`];
  for (const query of attempts) {
    const data = await getJson("https://danbooru.donmai.us/posts.json", { tags: query.trim(), limit: 40, random: "true" });
    const posts = normalize(data, {
      ext: (p, url) => (p.file_ext || extOf(url)).toLowerCase(),
      getUrl: (p) => {
        const ext = String(p.file_ext || "").toLowerCase();
        return ["jpg", "jpeg", "png"].includes(ext) ? p.large_file_url || p.file_url : p.file_url;
      },
      getTags: (p) => p.tag_string,
      getRating: (p) => p.rating
    });
    if (animated) return posts.filter((p) => ["mp4", "gif", "webm"].includes(p.ext));
    if (posts.length) return posts;
  }
  return [];
}

async function fromMoebooru(base, referer, tags) {
  const data = await getJson(`${base}/post.json`, {
    tags: [...tags, "-rating:safe", "order:random"].join(" "),
    limit: 40
  });
  return normalize(data, {
    ext: (p, url) => (p.file_ext || extOf(url)).toLowerCase(),
    getUrl: (p) => p.file_url || p.sample_url,
    getTags: (p) => p.tags,
    getRating: (p) => p.rating,
    extra: { referer }
  });
}

async function fromXbooru(tags) {
  const data = await getJson("https://xbooru.com/index.php", {
    page: "dapi",
    s: "post",
    q: "index",
    json: 1,
    limit: 60,
    tags: tags.join(" ")
  });
  const list = Array.isArray(data) ? data : [];
  return normalize(
    list.map((p) => ({
      ...p,
      built: p.file_url || (p.directory && p.image ? `https://xbooru.com/images/${p.directory}/${p.image}` : null)
    })),
    {
      getUrl: (p) => p.built,
      getTags: (p) => p.tags,
      getRating: (p) => p.rating || "e",
      extra: { referer: "https://xbooru.com/" }
    }
  );
}

const SOURCES = {
  danbooru: { label: "Danbooru", run: (tags) => fromDanbooru(tags, false) },
  yandere: { label: "Yande.re", run: (tags) => fromMoebooru("https://yande.re", "https://yande.re/", tags) },
  konachan: { label: "Konachan", run: (tags) => fromMoebooru("https://konachan.com", "https://konachan.com/", tags) },
  xbooru: { label: "Xbooru", run: (tags) => fromXbooru(tags) }
};

async function searchBooru(names, tags) {
  for (const name of names) {
    const source = SOURCES[name];
    if (!source) continue;
    try {
      const posts = await source.run(tags);
      if (posts.length) return { label: source.label, posts: shuffle(posts) };
    } catch {}
  }
  return null;
}

function convertToMp4(buffer, ext) {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const input = path.join(os.tmpdir(), `nsfw_${id}.${ext}`);
    const output = path.join(os.tmpdir(), `nsfw_${id}.mp4`);
    const clean = () => {
      for (const file of [input, output]) fs.rm(file, { force: true }, () => {});
    };
    fs.writeFileSync(input, buffer);
    const args = [
      "-y", "-i", input,
      "-movflags", "+faststart",
      "-pix_fmt", "yuv420p",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
      "-an",
      "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      output
    ];
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      clean();
      reject(new Error("ffmpeg timeout"));
    }, 60000);
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      clean();
      reject(err);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        clean();
        return reject(new Error(stderr.split("\n").slice(-3).join(" ").trim() || `ffmpeg salió con código ${code}`));
      }
      try {
        const result = fs.readFileSync(output);
        clean();
        resolve(result);
      } catch (err) {
        clean();
        reject(err);
      }
    });
  });
}

async function sendMedia(sock, msg, media, caption, mentions = [], { gif = false } = {}) {
  const chatId = msg.key.remoteJid;
  const buffer = await getBuffer(media.url, media.referer);
  const options = { quoted: msg };
  const base = { caption, mentions };

  if (["mp4", "webm", "gif"].includes(media.ext)) {
    let video = buffer;
    if (media.ext !== "mp4") {
      try {
        video = await convertToMp4(buffer, media.ext);
      } catch {
        if (media.ext === "gif") {
          return sock.sendMessage(chatId, { document: buffer, mimetype: "image/gif", fileName: "nsfw.gif", ...base }, options);
        }
        throw new Error("No se pudo convertir el video (¿ffmpeg instalado?)");
      }
    }
    return sock.sendMessage(chatId, { video, mimetype: "video/mp4", gifPlayback: gif, ...base }, options);
  }
  return sock.sendMessage(chatId, { image: buffer, ...base }, options);
}

function booruPlugin({ commands, description, sources }) {
  const handler = async (msg, ctx = {}) => {
    const sock = ctx.conn;
    const usedPrefix = ctx.usedPrefix || global.prefix || ".";
    const command = ctx.command || commands[0];
    const chatId = msg.key.remoteJid;
    try {
      if (!isEnabled(chatId)) return kit.reply(sock, msg, disabledText(usedPrefix));
      const tags = (ctx.args || [])
        .slice(0, 3)
        .map((t) => t.replace(/[^\w:().'!\-]/g, ""))
        .filter(Boolean);
      if (!tags.length) {
        return kit.reply(sock, msg, `《✧》 Debes especificar tags para buscar\n> Ejemplo » *${usedPrefix + command} neko*`);
      }
      if (isBlockedQuery(tags.join(" "))) {
        return kit.reply(sock, msg, "《✧》 Esa búsqueda no está permitida.");
      }
      await kit.react(sock, msg, "✧");
      const found = await searchBooru(sources, tags);
      if (!found) {
        await kit.react(sock, msg, "✖");
        return kit.reply(sock, msg, `《✧》 No se encontraron resultados para ${tags.join(" ")}`);
      }
      const caption = `ꕥ Resultados para » ${tags.join(" ")}\n> Fuente » ${found.label}`;
      const mentions = [pdb.selfJid(msg)].filter(Boolean);
      let sent = false;
      for (const post of found.posts.slice(0, 5)) {
        try {
          await sendMedia(sock, msg, post, caption, mentions);
          sent = true;
          break;
        } catch {}
      }
      if (!sent) {
        await kit.react(sock, msg, "✖");
        return kit.reply(sock, msg, `《✧》 No se pudo enviar ningún resultado para ${tags.join(" ")}`);
      }
      await kit.react(sock, msg, "✔");
    } catch (e) {
      await kit.react(sock, msg, "✖");
      return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
    }
  };
  handler.command = commands;
  handler.description = description;
  handler.category = "NSFW";
  return handler;
}

async function getPurrbot(type) {
  const data = await getJson(`https://api.purrbot.site/v2/img/nsfw/${type}/gif`);
  if (!data || data.error || typeof data.link !== "string") throw new Error("Purrbot sin resultado");
  return { url: data.link, ext: "gif" };
}

async function getAnimated(tag) {
  const posts = await fromDanbooru([tag], true);
  if (!posts.length) throw new Error("Sin resultados animados");
  return shuffle(posts)[0];
}

async function getReaction({ purr, tag }) {
  if (purr) {
    try {
      return await getPurrbot(purr);
    } catch {}
  }
  return getAnimated(tag);
}

module.exports = {
  isEnabled,
  setEnabled,
  isAdmin,
  disabledText,
  isBlockedQuery,
  isFlagged,
  getText,
  getJson,
  getBuffer,
  sendMedia,
  searchBooru,
  booruPlugin,
  getReaction,
  convertToMp4,
  extOf
};
