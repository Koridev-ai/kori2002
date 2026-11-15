"use strict";

const axios = require("axios");
const kit = require("../../libs/pluginkit");
const dl = require("../../libs/dlkit");

async function scrape(url) {
  const id = (url.match(/\/?id=([^&]+)/i) || url.match(/\/d\/(.*?)(?:\/|$)/))?.[1];
  if (!id) throw new Error("No se encontró ID de descarga");
  const res = await axios.post(`https://drive.google.com/uc?id=${id}&authuser=0&export=download`, null, {
    timeout: 30000,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      origin: "https://drive.google.com",
      "user-agent": dl.UA,
      "x-drive-first-party": "DriveWebUi",
      "x-json-requested": "true"
    },
    responseType: "text",
    transformResponse: (d) => d
  });
  const data = JSON.parse(String(res.data).slice(4));
  if (!data.downloadUrl) throw new Error("Se excedió el número de descargas del link");
  const head = await axios.head(data.downloadUrl, { timeout: 20000, headers: { "user-agent": dl.UA } }).catch(() => null);
  return {
    fileName: data.fileName,
    fileSize: `${(Number(data.sizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB`,
    mimetype: head?.headers?.["content-type"] || "application/octet-stream",
    downloadUrl: data.downloadUrl
  };
}

module.exports = dl.define({
  commands: ["drive", "gdrive"],
  description: "Descargar un archivo de Google Drive.",
  run: async ({ sock, msg, chatId, args }) => {
    if (!args[0]) return kit.reply(sock, msg, "《✧》 Por favor, ingresa un link de Google Drive.");
    if (!/drive\.google\.com\/(file\/d\/|open\?id=|uc\?id=)/i.test(args[0])) return kit.reply(sock, msg, "《✧》 La URL no parece válida de Google Drive.");
    await kit.react(sock, msg, "✧");
    const file = await scrape(args[0]);
    const caption = dl.cap("Google Drive", [["Nombre", file.fileName], ["Tamaño", file.fileSize], ["Tipo", file.mimetype], ["Enlace", args[0]]]);
    await sock.sendMessage(chatId, { document: { url: file.downloadUrl }, mimetype: file.mimetype, fileName: file.fileName, caption }, { quoted: msg });
    return kit.react(sock, msg, "✔");
  }
});
