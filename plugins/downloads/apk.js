"use strict";

const kit = require("../../libs/pluginkit");
const dl = require("../../libs/dlkit");

const MAX_APK = 500 * 1024 * 1024;

async function search(query) {
  const res = await dl.getJson(`https://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(query)}/limit=1`);
  return res?.datalist?.list?.[0] || null;
}

module.exports = dl.define({
  commands: ["apk", "aptoide", "apkdl"],
  description: "Buscar y descargar aplicaciones de Aptoide.",
  run: async ({ sock, msg, chatId, text }) => {
    if (!text) return kit.reply(sock, msg, "《✧》 Por favor, ingresa el nombre de la aplicación.");
    await kit.react(sock, msg, "✧");
    const app = await search(text);
    if (!app) return kit.reply(sock, msg, "《✧》 No se encontraron resultados.");
    const url = app.file?.path || app.file?.path_alt;
    if (!url) return kit.reply(sock, msg, "《✧》 No se pudo obtener la información de la aplicación.");
    const bytes = Number(app.size || app.file?.filesize || 0);
    const caption = dl.cap("Aptoide", [
      ["Nombre", app.name],
      ["Paquete", app.package],
      ["Versión", app.file?.vername],
      ["Última actualización", app.modified || app.updated],
      ["Tamaño", dl.formatBytes(bytes)]
    ]);
    if (bytes > MAX_APK) return kit.reply(sock, msg, `《✧》 El archivo es demasiado grande (${dl.formatBytes(bytes)}).\n> Descárgalo directamente desde aquí:\n${url}`);
    await sock.sendMessage(chatId, { document: { url }, mimetype: "application/vnd.android.package-archive", fileName: `${dl.cleanName(app.name, "app")}.apk`, caption }, { quoted: msg });
    return kit.react(sock, msg, "✔");
  }
});
