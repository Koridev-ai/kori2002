"use strict";

const kit = require("../../libs/pluginkit");
const dl = require("../../libs/dlkit");
const yt = require("../../libs/ytkit");

const MAX_VIDEO = 50 * 1024 * 1024;

module.exports = dl.define({
  commands: ["play2", "mp4", "ytmp4", "ytvideo", "playvideo"],
  description: "Descargar un vídeo de YouTube.",
  run: async ({ sock, msg, chatId, text }) => {
    if (!text) return kit.reply(sock, msg, "《✧》Por favor, menciona el nombre o URL del video que deseas descargar");
    await kit.react(sock, msg, "✧");
    const { url, info } = await yt.resolve(text);
    const media = await yt.fetchMedia("video", url);
    const title = info?.title || media.meta?.title || "video";
    const channel = info?.author?.name || media.meta?.channel || "Desconocido";
    const duration = info?.timestamp || media.meta?.duration || "Desconocido";
    const views = Number(info?.views || media.meta?.views || 0).toLocaleString("es-HN");
    const thumb = info?.image || info?.thumbnail || media.meta?.thumbnail || null;
    const quality = media.quality || "360p";
    const bytes = dl.parseSize(media.size) || (await dl.remoteSize(media.url));
    const sizeText = bytes ? dl.formatBytes(bytes) : media.size || "Desconocido";
    const caption = `➩ Descargando › *${title}*\n\n> ❖ Canal › *${channel}*\n> ⴵ Duración › *${duration}*\n> ❀ Vistas › *${views}*\n> ❒ Calidad › *${quality}*\n> ❒ Tamaño › *${sizeText}*\n> ❒ Enlace › *${url}*`;
    if (thumb) await sock.sendMessage(chatId, { image: { url: thumb }, caption }, { quoted: msg }).catch(() => kit.reply(sock, msg, caption));
    else await kit.reply(sock, msg, caption);

    const fileName = `${dl.cleanName(title, "video")}.mp4`;
    const footer = `✦ Video descargado\n\n> ❒ Calidad › *${quality}*\n> ❒ Tamaño › *${sizeText}*`;
    if (bytes && bytes > MAX_VIDEO) {
      await sock.sendMessage(chatId, { document: { url: media.url }, mimetype: "video/mp4", fileName, caption: footer }, { quoted: msg });
    } else {
      try {
        await sock.sendMessage(chatId, { video: { url: media.url }, mimetype: "video/mp4", fileName, caption: footer }, { quoted: msg });
      } catch {
        await sock.sendMessage(chatId, { document: { url: media.url }, mimetype: "video/mp4", fileName, caption: footer }, { quoted: msg });
      }
    }
    return kit.react(sock, msg, "✔");
  }
});
