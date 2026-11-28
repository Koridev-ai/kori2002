"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const axios = require("axios");
const { spawn } = require("child_process");
const kit = require("./pluginkit");
const pdb = require("./profiledb");
const lid = require("./lid");
const gmeta = require("./gmeta");

const FILE = path.resolve(__dirname, "..", "src", "nsfw.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const API_UA = "Mozilla/5.0 (compatible; KoriBot/1.0; +https://github.com/kori2002)";
const REFERERS = {
  "donmai.us": "https://danbooru.donmai.us/",
  "yande.re": "https://yande.re/",
  "konachan.com": "https://konachan.com/",
  "xbooru.com": "https://xbooru.com/",
  "allthefallen.moe": "https://booru.allthefallen.moe/",
  "tbib.org": "https://tbib.org/"
};
const MEDIA_EXT = ["jpg", "jpeg", "png", "gif", "mp4", "webm", "webp"];
const BLOCKED_TAGS = new Set([
  "loli", "lolicon", "shota", "shotacon", "child", "children", "toddler", "toddlercon", "underage",
  "preteen", "prepubescent", "infant", "baby", "minor", "aged_down", "age_regression", "kindergarten", "school_age"
]);

// Tags que indican contenido que no es anime/ilustración (3D, fotos, cosplay, etc.).
const NON_ANIME_TAGS = new Set([
  "3d", "3d_animation", "mmd", "mikumikudance", "source_filmmaker", "blender_(medium)", "koikatsu",
  "realistic", "photorealistic", "real_life", "real_life_insert", "photo_(medium)", "photo",
  "cosplay", "cosplay_photo", "live_action", "irl", "real", "western", "furry", "cartoon", "pixel_art",
  "anthro", "real_person", "realistic_(style)", "3dcg", "sfm", "gmod", "second_life", "pornstar", "amateur", "webcam", "western_animation", "comic_(western)"
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
  const meta = await gmeta.get(sock, chatId);
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

function isNonAnime(tagString) {
  return String(tagString || "")
    .toLowerCase()
    .split(/\s+/)
    .some((token) => NON_ANIME_TAGS.has(token));
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
  const config = (ua) => ({
    params,
    headers: { "User-Agent": ua, Accept: "application/json", ...headers },
    timeout: 15000
  });
  try {
    return (await axios.get(url, config(API_UA))).data;
  } catch (e) {
    // Algunos sitios (Cloudflare) bloquean según el User-Agent: reintenta con el otro.
    if (e?.response?.status !== 403) throw e;
    return (await axios.get(url, config(UA))).data;
  }
}

function errInfo(e) {
  const status = e?.response?.status;
  const d = e?.response?.data;
  const detail = typeof d === "string" ? d.replace(/\s+/g, " ").slice(0, 80) : d?.message || d?.error || d?.reason || "";
  return [status, detail || (status ? "" : e?.message)].filter(Boolean).join(" ");
}

function refererFor(url) {
  try {
    const host = new URL(url).hostname;
    const key = Object.keys(REFERERS).find((domain) => host === domain || host.endsWith("." + domain));
    return key ? REFERERS[key] : undefined;
  } catch {
    return undefined;
  }
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
  const ref = referer || refererFor(url);
  const config = (headers) => ({
    responseType: "arraybuffer",
    headers,
    timeout: 45000,
    maxContentLength: 60 * 1024 * 1024,
    maxBodyLength: 60 * 1024 * 1024
  });
  const attempts = [
    { "User-Agent": UA, ...(ref ? { Referer: ref } : {}) },
    { "User-Agent": UA },
    { "User-Agent": API_UA, Accept: "*/*" }
  ];
  let lastError = null;
  for (const headers of attempts) {
    try {
      const res = await axios.get(url, config(headers));
      return Buffer.from(res.data);
    } catch (e) {
      lastError = e;
      if (e?.response?.status !== 403) throw e;
    }
  }
  throw lastError;
}

function normalize(items, { ext, getUrl, getTags, getRating, extra, animeOnly = true }) {
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const url = getUrl(item);
    if (typeof url !== "string" || !url.startsWith("http")) continue;
    const kind = ext ? ext(item, url) : extOf(url);
    if (!MEDIA_EXT.includes(kind)) continue;
    const tags = getTags(item);
    if (isFlagged(tags)) continue;
    if (animeOnly && isNonAnime(tags)) continue;
    const rating = String(getRating(item) || "").toLowerCase();
    if (!["e", "q"].includes(rating[0])) continue;
    out.push({ url, ext: kind, referer: extra?.referer });
  }
  return out;
}

async function fromDanbooru(tags, animated, anime = true, base = "https://danbooru.donmai.us") {
  const single = tags.length < 2;
  const first = single ? tags[0] || "" : tags.slice(0, 2).join(" ");
  const attempts = animated
    ? [`${first} animated`, `${first} animated_gif`, `${first} video`, first]
    : single
      ? [`${first} rating:explicit`, `${first} rating:questionable`]
      : [first];
  let lastError = null;
  for (const query of attempts) {
    try {
      const params = { tags: query.trim(), limit: query.trim() === first ? 100 : 40, random: "true" };
      if (base === "https://danbooru.donmai.us" && process.env.DANBOORU_LOGIN && process.env.DANBOORU_API_KEY) {
        params.login = process.env.DANBOORU_LOGIN;
        params.api_key = process.env.DANBOORU_API_KEY;
      }
      const data = await getJson(`${base}/posts.json`, params);
      const posts = normalize(data, {
        ext: (p, url) => (p.file_ext || extOf(url)).toLowerCase(),
        getUrl: (p) => {
          const ext = String(p.file_ext || "").toLowerCase();
          return ["jpg", "jpeg", "png"].includes(ext) ? p.large_file_url || p.file_url : p.file_url;
        },
        getTags: (p) => p.tag_string,
        getRating: (p) => p.rating,
        animeOnly: anime
      });
      const usable = animated ? posts.filter((p) => ["mp4", "gif", "webm"].includes(p.ext)) : posts;
      if (usable.length) return usable;
    } catch (e) {
      lastError = e;
    }
  }
  if (lastError) throw lastError;
  return [];
}

async function fromMoebooru(base, referer, tags, animated = false, anime = true) {
  const query = animated ? [...tags, "animated", "order:random"] : [...tags, "-rating:safe", "order:random"];
  const data = await getJson(`${base}/post.json`, { tags: query.join(" "), limit: 40 });
  const posts = normalize(data, {
    ext: (p, url) => (p.file_ext || extOf(url)).toLowerCase(),
    getUrl: (p) => p.file_url || p.sample_url,
    getTags: (p) => p.tags,
    getRating: (p) => p.rating,
    extra: { referer },
    animeOnly: anime
  });
  return animated ? posts.filter((p) => ["mp4", "gif", "webm"].includes(p.ext)) : posts;
}

async function fromXbooru(tags, animated = false) {
  const data = await getJson("https://xbooru.com/index.php", {
    page: "dapi",
    s: "post",
    q: "index",
    json: 1,
    limit: 60,
    tags: [...tags, ...(animated ? ["animated"] : [])].join(" ")
  });
  const list = Array.isArray(data) ? data : [];
  const posts = normalize(
    list.map((p) => ({
      ...p,
      built: p.file_url || (p.directory && p.image ? `https://xbooru.com/images/${p.directory}/${p.image}` : null)
    })),
    {
      getUrl: (p) => p.built,
      getTags: (p) => p.tags,
      getRating: (p) => p.rating || "e",
      extra: { referer: "https://xbooru.com/" },
      animeOnly: true
    }
  );
  return animated ? posts.filter((p) => ["mp4", "gif", "webm"].includes(p.ext)) : posts;
}

async function fromGelbooru02(base, referer, tags, animated = false, anime = true) {
  const data = await getJson(`${base}/index.php`, {
    page: "dapi",
    s: "post",
    q: "index",
    json: 1,
    limit: 100,
    tags: [...tags, ...(animated ? ["animated"] : [])].join(" ")
  });
  const list = Array.isArray(data) ? data : Array.isArray(data?.post) ? data.post : [];
  const posts = normalize(
    list.map((p) => ({
      ...p,
      built: p.file_url || (p.directory && p.image ? `${base}/images/${p.directory}/${p.image}` : null)
    })),
    {
      getUrl: (p) => p.built,
      getTags: (p) => p.tags,
      getRating: (p) => p.rating || "e",
      extra: { referer },
      animeOnly: anime
    }
  );
  return animated ? posts.filter((p) => ["mp4", "gif", "webm"].includes(p.ext)) : posts;
}

const SOURCES = {
  danbooru: { label: "Danbooru", run: (tags) => fromDanbooru(tags, false) },
  yandere: { label: "Yande.re", run: (tags) => fromMoebooru("https://yande.re", "https://yande.re/", tags) },
  konachan: { label: "Konachan", run: (tags) => fromMoebooru("https://konachan.com", "https://konachan.com/", tags) },
  xbooru: { label: "Xbooru", run: (tags) => fromXbooru(tags) }
};

const TAG_CACHE = new Map();
const TAG_CACHE_LIMIT = 300;
const DANBOORU = "https://danbooru.donmai.us";

function danbooruAuth(params) {
  if (process.env.DANBOORU_LOGIN && process.env.DANBOORU_API_KEY) {
    params.login = process.env.DANBOORU_LOGIN;
    params.api_key = process.env.DANBOORU_API_KEY;
  }
  return params;
}

function tagName(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w:().'!\-]/g, "");
}

async function danbooruTags(params) {
  const data = await getJson(`${DANBOORU}/tags.json`, danbooruAuth({ limit: 30, ...params }));
  return (Array.isArray(data) ? data : [])
    .filter((t) => t?.name && Number(t.post_count) > 0 && !isFlagged(t.name.replace(/_/g, " ")) && !/loli|shota/.test(t.name));
}

async function danbooruAlias(name) {
  const data = await getJson(`${DANBOORU}/tag_aliases.json`, danbooruAuth({
    "search[antecedent_name]": name,
    "search[status]": "active",
    limit: 1
  }));
  return Array.isArray(data) && data[0]?.consequent_name ? data[0].consequent_name : null;
}

function rankTags(list) {
  return list.slice().sort((a, b) => {
    const ca = a.category === 4 ? 1 : 0;
    const cb = b.category === 4 ? 1 : 0;
    return cb - ca || Number(b.post_count) - Number(a.post_count);
  });
}

async function resolveOne(text) {
  const name = tagName(text);
  if (!name || name.length < 2) return null;
  if (TAG_CACHE.has(name)) return TAG_CACHE.get(name);

  let result = null;
  try {
    const exact = (await danbooruTags({ "search[name]": name, limit: 1 }))[0] || null;
    if (exact && exact.category !== 4 && Number(exact.post_count) >= 200) {
      result = { tag: exact.name, alternatives: [] };
    } else if (exact && exact.category === 4) {
      result = { tag: exact.name, alternatives: [] };
    } else {
      const aliased = await danbooruAlias(name).catch(() => null);
      const pool = new Map();
      const queries = [`${name}*`, `*${name}*`];
      for (const query of queries) {
        const list = await danbooruTags({ "search[name_matches]": query, "search[order]": "count" }).catch(() => []);
        for (const t of list) pool.set(t.name, t);
        if ([...pool.values()].some((t) => t.category === 4)) break;
      }
      if (aliased) {
        const target = (await danbooruTags({ "search[name]": aliased, limit: 1 }).catch(() => []))[0];
        if (target) pool.set(target.name, { ...target, post_count: Number(target.post_count) + 1e9 });
      }
      const ranked = rankTags([...pool.values()]);
      const best = ranked[0] || exact;
      if (best) {
        const alternatives = ranked
          .filter((t) => t.name !== best.name && t.category === 4)
          .slice(0, 3)
          .map((t) => t.name);
        result = { tag: best.name, alternatives };
      }
    }
  } catch {
    result = null;
  }

  if (TAG_CACHE.size >= TAG_CACHE_LIMIT) TAG_CACHE.delete(TAG_CACHE.keys().next().value);
  if (result) TAG_CACHE.set(name, result);
  return result;
}

async function resolveQuery(args) {
  const list = (args || []).map((t) => String(t)).filter(Boolean);
  const joined = list.join(" ").trim();
  const rawTags = (items) => items.map((t) => t.replace(/[^\w:().'!\-]/g, "")).filter(Boolean);

  if (joined.includes(",")) {
    const tags = [];
    let alternatives = [];
    for (const group of joined.split(",").map((g) => g.trim()).filter(Boolean)) {
      const hit = await resolveOne(group);
      tags.push(hit ? hit.tag : tagName(group));
      if (hit && !alternatives.length) alternatives = hit.alternatives;
    }
    return { tags: tags.filter(Boolean).slice(0, 3), alternatives };
  }

  if (list.some((t) => /[_:()]/.test(t))) {
    const rest = rawTags(list);
    if (list[0] && !/[_:()]/.test(list[0])) {
      const head = await resolveOne(list[0]);
      if (head) return { tags: [head.tag, ...rest.slice(1)].slice(0, 3), alternatives: head.alternatives };
    }
    return { tags: rest.slice(0, 3), alternatives: [] };
  }

  const whole = await resolveOne(joined);
  if (whole) return { tags: [whole.tag], alternatives: whole.alternatives };

  if (list.length > 1) {
    const first = await resolveOne(list[0]);
    if (first) return { tags: [first.tag, ...rawTags(list.slice(1))].slice(0, 3), alternatives: first.alternatives };
  }

  return { tags: rawTags(list).slice(0, 3), alternatives: [] };
}

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
      const rawArgs = (ctx.args || []).slice(0, 6);
      if (!rawArgs.join("").trim()) {
        return kit.reply(sock, msg, `《✧》 Debes especificar tags para buscar\n> Ejemplo » *${usedPrefix + command} eris*`);
      }
      if (isBlockedQuery(rawArgs.join(" "))) {
        return kit.reply(sock, msg, "《✧》 Esa búsqueda no está permitida.");
      }
      await kit.react(sock, msg, "✧");
      const resolved = await resolveQuery(rawArgs);
      const tags = resolved.tags;
      if (!tags.length) {
        await kit.react(sock, msg, "✖");
        return kit.reply(sock, msg, "《✧》 No se pudo interpretar la búsqueda.");
      }
      if (isBlockedQuery(tags.join(" ")) || isFlagged(tags.join(" ").replace(/_/g, " "))) {
        await kit.react(sock, msg, "✖");
        return kit.reply(sock, msg, "《✧》 Esa búsqueda no está permitida.");
      }
      const found = await searchBooru(sources, tags);
      if (!found) {
        await kit.react(sock, msg, "✖");
        return kit.reply(sock, msg, `《✧》 No se encontraron resultados para ${tags.join(" ")}`);
      }
      const hint = resolved.alternatives.length ? `\n> Coincidencias » ${resolved.alternatives.join(", ")}` : "";
      const caption = `ꕥ Resultados para » ${tags.join(" ")}\n> Fuente » ${found.label}${hint}`;
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

async function getWaifuIm(tag) {
  const attempts = [
    () =>
      getJson("https://api.waifu.im/images", {
        isNsfw: "true",
        isAnimated: "true",
        includedTags: tag,
        pageSize: 30
      }).then((data) => (Array.isArray(data?.items) ? data.items : [])),
    () =>
      getJson("https://api.waifu.im/search", {
        is_nsfw: "true",
        gif: "true",
        included_tags: tag,
        many: "true"
      }).then((data) => (Array.isArray(data?.images) ? data.images : []))
  ];
  let lastError = null;
  for (const attempt of attempts) {
    try {
      const posts = (await attempt())
        .filter((p) => typeof p?.url === "string" && p.url.startsWith("http"))
        .map((p) => ({ url: p.url, ext: extOf(p.url) }))
        .filter((p) => ["gif", "mp4", "webm"].includes(p.ext));
      if (posts.length) return shuffle(posts);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("Waifu.im sin resultados");
}

const REACTION_SOURCES = [
  { name: "danbooru", run: (tag, animated) => fromDanbooru([tag], animated, true) },
  { name: "yande.re", run: (tag, animated) => fromMoebooru("https://yande.re", "https://yande.re/", [tag], animated, true) },
  { name: "konachan", run: (tag, animated) => fromMoebooru("https://konachan.com", "https://konachan.com/", [tag], animated, true) },
  { name: "allthefallen", run: (tag, animated) => fromDanbooru([tag], animated, true, "https://booru.allthefallen.moe") },
  { name: "hijiribe", run: (tag, animated) => fromDanbooru([tag], animated, true, "https://hijiribe.donmai.us") },
  { name: "tbib", run: (tag, animated) => fromGelbooru02("https://tbib.org", "https://tbib.org/", [tag], animated, true) },
  { name: "xbooru", run: (tag, animated) => fromGelbooru02("https://xbooru.com", "https://xbooru.com/", [tag], animated, true) }
];

// Busca en todas las fuentes anime; si no hay animados, cae a imágenes estáticas del mismo tag.
async function getAnimatedList(tag, gifOnly = false, alt = []) {
  const errors = [];
  for (const animated of gifOnly ? [true] : [true, false]) {
    for (const name of [tag, ...alt]) {
      for (const source of REACTION_SOURCES) {
        try {
          const posts = await source.run(name, animated);
          if (posts.length) return shuffle(posts);
        } catch (e) {
          errors.push(`${source.name}: ${errInfo(e)}`);
        }
      }
    }
  }
  throw new Error(errors.length ? `Sin resultados (${errors.join(" | ")})` : "Sin resultados para esta reacción");
}

// Devuelve una lista de candidatos (el primero es el preferido) para poder reintentar si uno falla.
async function getReactionList({ purr, waifu, tag, alt, gifOnly }) {
  const list = [];
  if (purr) {
    try {
      list.push(await getPurrbot(purr));
    } catch {}
  }
  if (waifu) {
    try {
      list.push(...(await getWaifuIm(waifu)).slice(0, 4));
    } catch {}
  }
  try {
    list.push(...(await getAnimatedList(tag, gifOnly, alt)).slice(0, 6));
  } catch (e) {
    if (!list.length) throw e;
  }
  return list;
}

async function getReaction(reaction) {
  return (await getReactionList(reaction))[0];
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
  resolveQuery,
  booruPlugin,
  getReaction,
  getReactionList,
  convertToMp4,
  extOf
};
    
