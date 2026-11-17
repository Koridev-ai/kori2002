"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const dl = require("./dlkit");

const ANABOT_KEY = "freeApikey";
const PROVIDER_TIMEOUT_MS = Number(process.env.PLAY_PROVIDER_TIMEOUT_MS) || 25000;
const API_TIMEOUT_MS = Number(process.env.PLAY_API_AUDIO_TIMEOUT_MS) || 30000;
const YTDLP_TIMEOUT_MS = 45000;
const cooldowns = new Map();
const COOLDOWN_MS = 5 * 60 * 1000;

function loadYts() {
  try {
    return require("yt-search");
  } catch {
    throw new Error("Falta el módulo yt-search. Instálalo con: npm install yt-search");
  }
}

async function resolve(input) {
  const id = dl.youtubeId(input);
  if (id) {
    let info = null;
    try {
      info = await loadYts()({ videoId: id });
    } catch {}
    return { url: `https://youtu.be/${id}`, info: info && info.videoId ? info : null };
  }
  if (/^(https?:\/\/)?(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\//i.test(input)) return { url: input, info: null };
  const search = await loadYts()(input);
  const video = (search.videos || [])[0] || (search.all || []).find((v) => v.type === "video");
  if (!video) throw new Error("No se encontró un video válido de YouTube");
  return { url: video.url, info: video };
}

function lempi(kind, url) {
  return async () => {
    const lempiApi = dl.api("lempi");
    const path = kind === "audio" ? "/dl/yta" : "/dl/ytv";
    const json = await dl.getJson(`${lempiApi.url}${path}`, { params: { url, apikey: lempiApi.key } });
    if (!json?.status || !json?.descarga?.url) return null;
    return {
      url: json.descarga.url,
      name: json.descarga.archivo || null,
      quality: json.descarga.calidad || null,
      size: json.descarga.tamaño || null,
      meta: { title: json.titulo, channel: json.canal?.nombre, duration: json.duracion, views: json.vistas, thumbnail: json.miniatura }
    };
  };
}

function generic(kind, base, path, params) {
  return async () => {
    const json = await dl.getJson(`${dl.api(base).url}${path}`, { params });
    const keys = ["dl", "download", "downloadUrl", "download_url", "link", "url"];
    const found = dl
      .deepFindAll(json, keys)
      .filter((link) => !/(youtube\.com|youtu\.be|ytimg\.com)\//i.test(link) && !/\.(jpe?g|png|webp)(\?|$)/i.test(link));
    return found.length ? { url: found[0], alts: found.slice(1), name: null, quality: null, size: null, meta: null } : null;
  };
}

function providers(kind, url) {
  const audio = kind === "audio";
  return [
    lempi(kind, url),
    generic(kind, "siputzx", audio ? "/api/d/ytmp3" : "/api/d/ytmp4", { url }),
    generic(kind, "vreden", audio ? "/api/v1/download/youtube/audio" : "/api/v1/download/youtube/video", { url, quality: audio ? "128" : "360" }),
    generic(kind, "zenzxz", audio ? "/download/ytmp3" : "/download/ytmp4", { url }),
    generic(kind, "delirius", audio ? "/download/ytmp3" : "/download/ytmp4", { url })
  ];
}

async function fetchMedia(kind, url) {
  const result = await dl.chain(providers(kind, url));
  if (!result) throw new Error("Ninguna API devolvió un enlace de descarga");
  return result;
}

async function loadModule(name) {
  try {
    return require(name);
  } catch {
    try {
      return await import(name);
    } catch {
      return null;
    }
  }
}

function describe(error) {
  return error?.message || String(error);
}

function withTimeout(name, promise) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${name}: tiempo agotado`)), PROVIDER_TIMEOUT_MS);
  });
  promise.catch(() => {});
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function guarded(name, run) {
  return async () => {
    if (Date.now() < (cooldowns.get(name) || 0)) throw new Error(`${name}: deshabilitado temporalmente (fallos recientes)`);
    try {
      return await withTimeout(name, run());
    } catch (e) {
      cooldowns.set(name, Date.now() + COOLDOWN_MS);
      throw new Error(`${name}: ${describe(e).replace(new RegExp(`^${name}: `), "")}`);
    }
  };
}

function ytdlApi(url) {
  return async () => {
    const base = String(process.env.YTDL_API_URL || "").trim().replace(/\/+$/, "");
    const key = String(process.env.YTDL_API_KEY || "").trim();
    if (!base || !key) return null;
    const data = await dl.getJson(`${base}/api/audio`, {
      method: "post",
      data: { url, format: "mp3" },
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      timeout: API_TIMEOUT_MS
    });
    if (!data?.download_url) throw new Error("La API no devolvió un archivo");
    const link = `${base}${new URL(String(data.download_url)).pathname}`;
    return { url: link, headers: { "x-api-key": key }, name: data.file_name || null, meta: { title: data.title } };
  };
}

function ytdlp(url) {
  return () =>
    new Promise((resolve, reject) => {
      const bin = process.env.YTDLP_PATH || "yt-dlp";
      const prefix = `ytdlp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const dir = os.tmpdir();
      const extra = String(process.env.YTDLP_EXTRA_ARGS || "").split(/\s+/).filter(Boolean);
      const runtime = extra.includes("--js-runtimes") ? [] : ["--js-runtimes", `node:${process.execPath}`];
      const args = ["--no-playlist", "--no-warnings", "--no-mtime", ...runtime, ...extra, "-f", "ba[ext=m4a]/ba/b", "-o", path.join(dir, `${prefix}.%(ext)s`), url];
      const cleanup = () => {
        for (const name of fs.readdirSync(dir)) if (name.startsWith(prefix)) fs.rm(path.join(dir, name), { force: true }, () => {});
      };
      execFile(bin, args, { timeout: YTDLP_TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024 }, (err, _out, stderr) => {
        if (err) {
          cleanup();
          if (err.code === "ENOENT") return resolve(null);
          const detail = String(stderr || "").trim().split("\n").filter(Boolean).pop();
          return reject(new Error(`yt-dlp: ${(detail || err.message).slice(0, 200)}`));
        }
        try {
          const file = fs.readdirSync(dir).find((name) => name.startsWith(prefix));
          if (!file) throw new Error("yt-dlp: no se generó el archivo de salida");
          const buffer = fs.readFileSync(path.join(dir, file));
          cleanup();
          resolve({ buffer, meta: null });
        } catch (e) {
          cleanup();
          reject(e);
        }
      });
    });
}

function vredenLib(url) {
  return guarded("vreden", async () => {
    const mod = await loadModule("@vreden/youtube_scraper");
    const fn = mod?.ytmp3 || mod?.default?.ytmp3;
    if (!fn) throw new Error("módulo @vreden/youtube_scraper no instalado");
    const d = await fn(url);
    if (!d?.status || !d?.download?.url) throw new Error("sin URL");
    return { url: d.download.url, meta: { title: d.metadata?.title } };
  });
}

function btch(url) {
  return guarded("btch", async () => {
    const mod = await loadModule("btch-downloader");
    const fn = mod?.youtube || mod?.default?.youtube;
    if (!fn) throw new Error("módulo btch-downloader no instalado");
    const d = await fn(url);
    if (!d?.status || !d?.mp3) throw new Error("sin URL");
    return { url: d.mp3, meta: { title: d.title } };
  });
}

function anabot(query) {
  return guarded("anabot", async () => {
    const json = await dl.getJson("https://anabot.my.id/api/download/playmusic", { params: { query, apikey: ANABOT_KEY }, timeout: 15000 });
    const result = json?.data?.result;
    if (!result?.success || !result.urls) throw new Error("sin resultado");
    return { url: result.urls, meta: { title: result.metadata?.title } };
  });
}

async function attempt(run) {
  const media = await run();
  if (!media) return null;
  const candidates = media.buffer
    ? [{ buffer: media.buffer }]
    : [media.url, ...(media.alts || [])].map((link, i) => ({ url: link, headers: i === 0 ? media.headers : undefined }));
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const buffer = candidate.buffer || (await dl.getBuffer(candidate.url, { headers: candidate.headers }));
      if (!buffer.length) throw new Error("Archivo vacío");
      const audio = await dl.toPlayableAudio(buffer);
      return { media: { ...media, url: candidate.url || null }, audio };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("sin resultado");
}

async function fetchAudio(url, title) {
  const errors = [];

  for (const [name, run] of [["api", ytdlApi(url)], ["yt-dlp", ytdlp(url)]]) {
    try {
      const result = await attempt(run);
      if (result) return result;
    } catch (e) {
      errors.push(`${name}: ${describe(e)}`);
    }
  }

  try {
    return await Promise.any(
      [vredenLib(url), btch(url), anabot(title || url)].map(async (run) => {
        const result = await attempt(run);
        if (!result) throw new Error("sin resultado");
        return result;
      })
    );
  } catch (e) {
    if (e instanceof AggregateError) errors.push(...e.errors.map(describe));
    else errors.push(describe(e));
  }

  for (const run of providers("audio", url)) {
    try {
      const result = await attempt(run);
      if (result) return result;
    } catch (e) {
      errors.push(describe(e));
    }
  }

  throw new Error(errors.length ? `Ninguna API devolvió audio válido (${errors.slice(-4).join(" | ")})` : "Ninguna API devolvió un enlace de descarga");
}

module.exports = { resolve, fetchMedia, fetchAudio };
