"use strict";

const path = require("path");
const cheerio = require("cheerio");
const kit = require("../../libs/pluginkit");
const dl = require("../../libs/dlkit");

const clean = (x) => String(x || "").replace(/\s+/g, " ").trim();

const MIME = { apk: "application/vnd.android.package-archive", zip: "application/zip", rar: "application/vnd.rar", "7z": "application/x-7z-compressed", pdf: "application/pdf", mp4: "video/mp4", mp3: "audio/mpeg", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", txt: "text/plain", json: "application/json", mkv: "video/x-matroska" };

async function scrape(url) {
  const page = await dl.getText(url, { headers: { "Accept-Language": "en-US,en;q=0.9" }, timeout: 45000 });
  if (page.status < 200 || page.status >= 400) throw new Error(`MediaFire HTTP ${page.status}`);
  const $ = cheerio.load(page.body);
  let link = $("#downloadButton").attr("href") || $("a#downloadButton").attr("href") || null;
  if (link && link.startsWith("//")) link = `https:${link}`;
  if (link && link.startsWith("/")) link = `https://www.mediafire.com${link}`;
  if (!link) throw new Error("Download link not found");
  const filename = clean($(".intro .filename").text()) || clean($('meta[property="og:title"]').attr("content")) || clean($("title").text()) || "archivo";
  let size = null;
  let uploaded = null;
  $("ul.details li").each((_, el) => {
    const t = clean($(el).text());
    if (!size && /File size:/i.test(t)) size = clean($(el).find("span").text()) || null;
    if (!uploaded && /Uploaded:/i.test(t)) uploaded = clean($(el).find("span").text()) || null;
  });
  return { link, filename, size, uploaded };
}

module.exports = dl.define({
  commands: ["mediafire", "mf"],
  description: "Descargar un archivo de MediaFire.",
  run: async ({ sock, msg, chatId, text }) => {
    if (!text) return kit.reply(sock, msg, "《✧》 Por favor, ingresa el enlace de Mediafire.");
    if (!/^https?:\/\/(www\.)?mediafire\.com\/.+/i.test(text)) return kit.reply(sock, msg, "《✧》 Por favor, ingresa un enlace válido de Mediafire.");
    await kit.react(sock, msg, "✧");
    const file = await scrape(text);
    const ext = path.extname(file.filename).replace(".", "").toLowerCase();
    const mimetype = MIME[ext] || "application/octet-stream";
    const caption = dl.cap("MediaFire", [["Nombre", file.filename], ["Tipo", mimetype], ["Peso", file.size], ["Subido", file.uploaded]]);
    await sock.sendMessage(chatId, { document: { url: file.link }, mimetype, fileName: file.filename, caption }, { quoted: msg });
    return kit.react(sock, msg, "✔");
  }
});
