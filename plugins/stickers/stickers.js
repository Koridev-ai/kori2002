"use strict";

const axios = require("axios");
const crypto = require("crypto");
const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

const API = "https://api.sticker.ly/v4/stickerPack";
const MAX_STICKERS = 50;
const FALLBACK_LIMIT = 10;
const API_HEADERS = {
  "user-agent": "androidapp.stickerly/1.17.0 (G011A; U; Android 22; es-ES; ES;)",
  "content-type": "application/json",
  "x-duid": crypto.randomBytes(16).toString("hex")
};
const URL_REGEX = /(?:https?:\/\/)?(?:www\.)?sticker\.ly\/s\/([a-zA-Z0-9]+)/i;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(fn, attempt = 1) {
  try {
    return await fn();
  } catch (e) {
    if (e.response?.status === 429 && attempt <= 3) {
      await delay((e.response.headers["retry-after"] || 5) * 1000);
      return withRetry(fn, attempt + 1);
    }
    throw e;
  }
}

function normalizePack(raw) {
  const prefix = raw.resourceUrlPrefix || "";
  const files = Array.isArray(raw.resourceFiles) ? raw.resourceFiles : [];
  return {
    name: raw.name || "Sticker Pack",
    author: raw.authorName || raw.author?.displayName || raw.author?.username || "",
    isAnimated: Boolean(raw.isAnimated),
    stickers: files.map((file) => `${prefix}${file}`)
  };
}

async function searchPacks(query) {
  const body = {
    keyword: query,
    enabledKeywordSearch: true,
    filter: {
      extendSearchResult: false,
      sortBy: "RECOMMENDED",
      languages: ["ALL"],
      minStickerCount: 5,
      searchBy: "ALL",
      stickerType: "ALL"
    }
  };
  const res = await withRetry(() => axios.post(`${API}/smartSearch`, body, { headers: API_HEADERS, timeout: 15000 }));
  return res.data?.result?.stickerPacks || [];
}

async function packFromUrl(code) {
  const res = await withRetry(() =>
    axios.get(`https://sticker.ly/s/${code}`, { headers: { "user-agent": API_HEADERS["user-agent"] }, timeout: 15000 })
  );
  const html = String(res.data || "");
  const prefix = html.match(/"resourceUrlPrefix"\s*:\s*"([^"]+)"/)?.[1]?.replace(/\\\//g, "/");
  const filesRaw = html.match(/"resourceFiles"\s*:\s*(\[[^\]]*\])/)?.[1];
  const name = html.match(/"name"\s*:\s*"([^"]+)"/)?.[1] || html.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
  if (prefix && filesRaw) {
    let files = [];
    try {
      files = JSON.parse(filesRaw);
    } catch {
      files = [];
    }
    if (files.length) {
      return normalizePack({ name, resourceUrlPrefix: prefix, resourceFiles: files, isAnimated: /"isAnimated"\s*:\s*true/.test(html) });
    }
  }
  if (name) {
    const results = await searchPacks(name);
    if (results.length) return normalizePack(results[0]);
  }
  return null;
}

function filterRelevant(packs, query) {
  const term = query.toLowerCase().trim();
  if (!term) return packs;
  return packs.filter((pack) => (pack.name || "").toLowerCase().includes(term));
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function sendIndividually(sock, chatId, msg, urls, packname, author) {
  let sent = 0;
  for (const url of urls.slice(0, FALLBACK_LIMIT)) {
    try {
      const res = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
      const buffer = Buffer.from(res.data);
      const withExif = await sk.addExif(buffer, packname, author, ["🎭"]).catch(() => buffer);
      await sock.sendMessage(chatId, { sticker: withExif }, { quoted: msg });
      sent++;
    } catch {}
  }
  return sent;
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "stickers";
  const text = (ctx.args || []).join(" ").trim();

  try {
    if (!text) {
      return kit.reply(sock, msg, "《✧》 Ingresa un texto para buscar packs de stickers o una URL de sticker.ly.");
    }
    await kit.react(sock, msg, "🕒");

    const username = msg.pushName || sk.userKey(ctx, msg);
    let packData = null;

    const urlMatch = text.match(URL_REGEX);
    if (urlMatch) {
      packData = await packFromUrl(urlMatch[1]).catch(() => null);
      if (!packData) {
        await kit.react(sock, msg, "✖️");
        return kit.reply(sock, msg, "《✧》 El pack de la URL no está disponible o es privado.");
      }
      if (!packData.stickers.length) {
        await kit.react(sock, msg, "✖️");
        return kit.reply(sock, msg, "《✧》 No se pudo obtener el pack desde la URL.");
      }
    } else {
      const results = await searchPacks(text);
      if (!results.length) {
        await kit.react(sock, msg, "✖️");
        return kit.reply(sock, msg, `《✧》 No se encontraron packs para *${text}*.`);
      }
      const relevant = filterRelevant(results, text);
      const candidates = shuffle(relevant.length ? relevant : results).slice(0, 5);
      packData = candidates.map(normalizePack).find((pack) => pack.stickers.length > 0) || null;
      if (!packData) {
        await kit.react(sock, msg, "✖️");
        return kit.reply(sock, msg, "《✧》 No se pudo descargar ningún pack válido.");
      }
    }

    const urls = packData.stickers.slice(0, MAX_STICKERS);
    if (!urls.length) {
      await kit.react(sock, msg, "✖️");
      return kit.reply(sock, msg, "《✧》 El pack no contiene stickers válidos.");
    }

    const publisher = packData.author || `@${username}`;
    const description = sock.user?.name || "Rem";
    const stickerPack = {
      name: packData.name,
      publisher,
      description,
      stickers: urls.map((url) => ({ url, isAnimated: packData.isAnimated, isLottie: false, emojis: ["🎭"] }))
    };

    try {
      await sock.sendMessage(chatId, { stickerPack }, { quoted: msg });
    } catch {
      const sent = await sendIndividually(sock, chatId, msg, urls, packData.name, publisher);
      if (!sent) throw new Error("No se pudo enviar el pack");
    }
    await kit.react(sock, msg, "✔️");
  } catch (e) {
    await kit.react(sock, msg, "✖️");
    return kit.reply(sock, msg, `> Error: *${e.message}*`);
  }
};

handler.command = ["spack", "stickers", "stickerly"];
handler.description = "Buscar y descargar packs de stickers.";
handler.category = "Stickers";
module.exports = handler;
