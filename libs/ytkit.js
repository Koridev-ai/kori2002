"use strict";

const dl = require("./dlkit");

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
    const found = dl.deepFind(json, keys);
    return found ? { url: found, name: null, quality: null, size: null, meta: null } : null;
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

module.exports = { resolve, fetchMedia };
