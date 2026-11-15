"use strict";

const axios = require("axios");
const kit = require("../../libs/pluginkit");
const dl = require("../../libs/dlkit");
const banned = require("../../libs/dlwords");

const SINGLE = new Set(banned.filter((w) => !/[\s.]/.test(w)).map((w) => w.toLowerCase()));
const MULTI = banned.filter((w) => /[\s.]/.test(w)).map((w) => w.toLowerCase());

function isAdultQuery(text) {
  const lower = String(text).toLowerCase();
  if (MULTI.some((w) => lower.includes(w))) return true;
  return lower.split(/[^\p{L}\p{N}@_$]+/u).filter(Boolean).some((t) => SINGLE.has(t));
}

async function accessible(url) {
  try {
    const res = await axios.head(url, { timeout: 5000, headers: { "User-Agent": dl.UA }, maxRedirects: 3, validateStatus: (s) => s < 400 });
    return String(res.headers["content-type"] || "").startsWith("image/");
  } catch {
    try {
      await axios.get(url, { timeout: 5000, headers: { "User-Agent": dl.UA, Range: "bytes=0-1023" }, maxRedirects: 3, responseType: "arraybuffer", validateStatus: (s) => s < 400 || s === 206 });
      return true;
    } catch {
      return false;
    }
  }
}

function providers(query) {
  return [
    async () => {
      const res = await dl.getJson(`${dl.api("delirius").url}/search/gimage`, { params: { query } });
      if (!res?.status || !Array.isArray(res.data)) return null;
      const list = res.data.map((i) => ({ url: i.url, title: i.origin?.title || null, domain: i.origin?.website?.domain || null, resolution: i.width && i.height ? `${i.width}x${i.height}` : null }));
      return list.length ? list : null;
    },
    async () => {
      const res = await dl.getJson(`${dl.api("siputzx").url}/api/images`, { params: { query } });
      const raw = Array.isArray(res?.data) ? res.data : [];
      const list = raw.map((i) => ({ url: i.url || i.image || i.imageUrl, title: i.title || null, domain: null, resolution: null })).filter((i) => i.url);
      return list.length ? list : null;
    },
    async () => {
      const res = await dl.getJson(`${dl.api("vreden").url}/api/v1/search/google/image`, { params: { query } });
      const raw = res?.result?.results || res?.result || [];
      const list = (Array.isArray(raw) ? raw : []).map((i) => ({ url: i.url || i.image || i.original, title: i.title || null, domain: null, resolution: null })).filter((i) => i.url);
      return list.length ? list : null;
    }
  ];
}

module.exports = dl.define({
  commands: ["imagen", "img", "image"],
  description: "Buscar y descargar imágenes de Google.",
  run: async ({ sock, msg, chatId, text }) => {
    if (!text) return kit.reply(sock, msg, "《✧》 Por favor, Ingrese un término de búsqueda.");
    if (!dl.nsfw.isEnabled(chatId) && isAdultQuery(text)) {
      return kit.reply(sock, msg, "《✧》 Este comando no *permite* búsquedas de contenido *+18* o *NSFW*");
    }
    await kit.react(sock, msg, "✧");
    const results = await dl.chain(providers(text));
    if (!results?.length) return kit.reply(sock, msg, `《✧》 No se encontraron imágenes para "${text}".`);
    const checks = await Promise.allSettled(results.slice(0, 15).map(async (r) => ((await accessible(r.url)) ? r : null)));
    const valid = checks.filter((c) => c.status === "fulfilled" && c.value).map((c) => c.value);
    if (valid.length < 2) return kit.reply(sock, msg, "《✧》 Se requieren al menos 2 imágenes válidas para mostrar un álbum.");
    const items = valid.slice(0, 10).map((r) => ({
      type: "image",
      data: { url: r.url },
      caption: dl.cap("Google Image Search", [["Título", r.title], ["Fuente", r.domain], ["Resolución", r.resolution], ["Búsqueda", text]])
    }));
    await dl.sendAlbum(sock, chatId, items, msg);
    return kit.react(sock, msg, "✔");
  }
});
