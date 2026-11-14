"use strict";

const cheerio = require("cheerio");
const kit = require("../../libs/pluginkit");
const nsfw = require("../../libs/nsfwkit");

const BASE = "https://www.xvideos.com";

function formatDuration(seconds) {
  const s = parseInt(seconds, 10) || 0;
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${s}s`;
}

async function download(url) {
  const html = await nsfw.getText(url);
  const $ = cheerio.load(html);
  const title = $("meta[property='og:title']").attr("content");
  const duration = formatDuration($('meta[property="og:duration"]').attr("content"));
  const views = $("span.nb_views").text().trim() || $("strong.mobile-hide").text().trim();
  const likes = $("span.rating-good-nbr").text().trim();
  const dislikes = $("span.rating-bad-nbr").text().trim();
  let videoUrl = $("#html5video > #html5video_base > div > a").attr("href");
  if (!videoUrl) {
    const high = html.match(/html5player\.setVideoUrlHigh\('(.*?)'\);/);
    const low = html.match(/html5player\.setVideoUrlLow\('(.*?)'\);/);
    videoUrl = (high && high[1]) || (low && low[1]);
  }
  return { title, duration, views, likes, dislikes, url: videoUrl };
}

async function search(query) {
  const html = await nsfw.getText(`${BASE}/?k=${encodeURIComponent(query)}`);
  const $ = cheerio.load(html);
  const results = [];
  $("div.mozaique > div").each((i, el) => {
    const title = $(el).find("p.title a").attr("title");
    const href = $(el).find("p.title a").attr("href");
    if (title && href) results.push({ title, url: BASE + href });
  });
  return results;
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "xvideos";

  try {
    if (!nsfw.isEnabled(chatId)) return kit.reply(sock, msg, nsfw.disabledText(usedPrefix));
    const query = (ctx.args || []).join(" ").trim();
    if (!query) return kit.reply(sock, msg, "《✧》 Por favor, ingresa el título o URL del video de XVIDEOS.");
    if (nsfw.isBlockedQuery(query)) return kit.reply(sock, msg, "《✧》 Esa búsqueda no está permitida.");

    if (/xvideos\.com/i.test(query)) {
      await kit.react(sock, msg, "✧");
      const res = await download(query);
      if (!res.url) throw new Error("No se pudo obtener el video");
      const caption = `乂 ¡XVIDEOS - DOWNLOAD! 乂\n\n≡ Título : ${res.title}\n≡ Duración : ${res.duration || "Desconocida"}\n≡ Likes : ${res.likes || "Desconocidos"}\n≡ Des-Likes : ${res.dislikes || "Desconocidos"}\n≡ Vistas : ${res.views || "Desconocidas"}`;
      await sock.sendMessage(chatId, { document: { url: res.url }, mimetype: "video/mp4", fileName: `${res.title}.mp4`, caption }, { quoted: msg });
      return kit.react(sock, msg, "✔");
    }

    const results = await search(query);
    if (!results.length) return kit.reply(sock, msg, "《✧》 No se encontraron resultados.");
    const list = results
      .slice(0, 10)
      .map((v, i) => `${i + 1}\n≡ Título : ${v.title}\n≡ Link : ${v.url}`)
      .join("\n\n");
    return kit.reply(sock, msg, `乂 ¡XVIDEOS - SEARCH! 乂\n\n${list}\n\n> » Usa directamente la URL de uno de los vídeos para descargarlo.`);
  } catch (e) {
    await kit.react(sock, msg, "✖");
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["xvideos"];
handler.description = "Buscar y descargar videos de XVIDEOS.";
handler.category = "NSFW";
module.exports = handler;
