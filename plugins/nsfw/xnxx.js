"use strict";

const cheerio = require("cheerio");
const kit = require("../../libs/pluginkit");
const nsfw = require("../../libs/nsfwkit");

const BASE = "https://www.xnxx.com";

const cleanNumber = (s) => {
  const m = String(s || "").match(/([0-9][0-9.,\s]*)/);
  return m ? m[1].replace(/\s+/g, "").trim() : "";
};

function parseInfo(infoStr = "", viewsStr = "", pageText = "", jsonViews = "") {
  let dur = "";
  let qual = "";
  let views = "";
  const durMatch = infoStr.match(/(\d+\s?min)/i);
  if (durMatch) dur = durMatch[1];
  const qualMatch = infoStr.match(/([0-9]{3,4}p)/i);
  if (qualMatch) qual = qualMatch[1];
  if (jsonViews) views = cleanNumber(jsonViews);
  if (!views && viewsStr) views = cleanNumber(viewsStr);
  if (!views && pageText) {
    const m = pageText.match(/([0-9][0-9.,\s]*)\s*(views|view|visualizaciones|vistas)/i);
    if (m) views = cleanNumber(m[1]);
  }
  return { dur, qual, views };
}

async function download(url) {
  const html = await nsfw.getText(url);
  const $ = cheerio.load(html);
  const title = $('meta[property="og:title"]').attr("content") || $("title").text().trim();
  const info = $("span.metadata").text() || $(".video-metadata .metadata").text();
  const scripts = [];
  $("script").each((i, el) => {
    const txt = $(el).html() || "";
    if (txt.includes("html5player.setVideoUrl")) scripts.push(txt);
  });
  const block = scripts.join("\n");
  const files = {
    low: (block.match(/html5player\.setVideoUrlLow\('(.*?)'\);/) || [])[1],
    high: (block.match(/html5player\.setVideoUrlHigh\('(.*?)'\);/) || [])[1]
  };
  const candidates = [
    $(".nb_views").text(),
    $(".rating-box strong").text(),
    $(".metadata:contains('views')").text(),
    $(".metadata:contains('vistas')").text(),
    $(".video-details").text()
  ];
  const viewsStr = candidates.find((v) => (v || "").trim().length) || "";
  let jsonViews = "";
  const jsonLd = $('script[type="application/ld+json"]').html();
  if (jsonLd) {
    try {
      const data = JSON.parse(jsonLd);
      jsonViews = String(data.interactionStatistic?.userInteractionCount || data.aggregateRating?.ratingCount || "");
    } catch {}
  }
  return { title, files, info: parseInfo(info, viewsStr, $.root().text(), jsonViews) };
}

async function search(query) {
  const page = Math.floor(Math.random() * 3) + 1;
  const html = await nsfw.getText(`${BASE}/search/${encodeURIComponent(query)}/${page}`);
  const $ = cheerio.load(html);
  const results = [];
  $("div.mozaique div.thumb-under").each((i, el) => {
    const href = $(el).find("a").attr("href") || "";
    if (!href) return;
    const link = BASE + href.replace("/THUMBNUM/", "/");
    const title = $(el).find("a").attr("title") || $(el).find("a").text().trim() || $(el).find("span").text().trim() || "Sin título";
    results.push({ title, link });
  });
  return results;
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "xnxx";

  try {
    if (!nsfw.isEnabled(chatId)) return kit.reply(sock, msg, nsfw.disabledText(usedPrefix));
    const query = (ctx.args || []).join(" ").trim();
    if (!query) return kit.reply(sock, msg, "《✧》 Por favor, ingresa el título o URL del video de XNXX.");
    if (nsfw.isBlockedQuery(query)) return kit.reply(sock, msg, "《✧》 Esa búsqueda no está permitida.");

    if (/xnxx\.com/i.test(query)) {
      await kit.react(sock, msg, "✧");
      const res = await download(query);
      const url = res.files.high || res.files.low;
      if (!url) throw new Error("No se pudo obtener el video");
      const { dur, qual, views } = res.info;
      const caption = `乂 ¡XNXX - DOWNLOAD! 乂\n\n≡ Título : ${res.title}\n≡ Duración : ${dur || "Desconocida"}\n≡ Calidad : ${qual || "Desconocida"}\n≡ Vistas : ${views || "Desconocidas"}`;
      await sock.sendMessage(chatId, { document: { url }, mimetype: "video/mp4", fileName: `${res.title}.mp4`, caption }, { quoted: msg });
      return kit.react(sock, msg, "✔");
    }

    const results = await search(query);
    if (!results.length) return kit.reply(sock, msg, "《✧》 No se encontraron resultados.");
    const list = results
      .slice(0, 10)
      .map((v, i) => `${i + 1}\n≡ Título : ${v.title}\n≡ Link : ${v.link}`)
      .join("\n\n");
    return kit.reply(sock, msg, `乂 ¡XNXX - SEARCH! 乂\n\n${list}\n\n> » Usa directamente la URL de uno de los vídeos para descargarlo.`);
  } catch (e) {
    await kit.react(sock, msg, "✖");
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["xnxx"];
handler.description = "Buscar y descargar videos de XNXX.";
handler.category = "NSFW";
module.exports = handler;
