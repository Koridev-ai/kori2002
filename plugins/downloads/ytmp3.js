"use strict";

const kit = require("../../libs/pluginkit");
const dl = require("../../libs/dlkit");
const yt = require("../../libs/ytkit");

module.exports = dl.define({
  commands: ["play", "mp3", "ytmp3", "ytaudio", "playaudio"],
  description: "Descargar una canción de YouTube.",
  run: async ({ sock, msg, chatId, text }) => {
    if (!text) return kit.reply(sock, msg, "《✧》Por favor, menciona el nombre o URL del video que deseas descargar");
    await kit.react(sock, msg, "✧");
    const { url, info } = await yt.resolve(text);
    let title = info?.title || "audio";
    if (info) {
      const views = Number(info.views || 0).toLocaleString("es-HN");
      const channel = info.author?.name || info.author || "Desconocido";
      const caption = `➩ Descargando › *${title}*\n\n> ❖ Canal › *${channel}*\n> ⴵ Duración › *${info.timestamp || "Desconocido"}*\n> ❀ Vistas › *${views}*\n> ✩ Publicado › *${info.ago || "Desconocido"}*\n> ❒ Enlace › *${url}*`;
      const thumb = info.image || info.thumbnail;
      if (thumb) await sock.sendMessage(chatId, { image: { url: thumb }, caption }, { quoted: msg }).catch(() => kit.reply(sock, msg, caption));
      else await kit.reply(sock, msg, caption);
    }
    const media = await yt.fetchMedia("audio", url);
    title = info?.title || media.meta?.title || title;
    const buffer = await dl.getBuffer(media.url);
    if (!buffer.length) throw new Error("No se pudo descargar el audio");
    await sock.sendMessage(chatId, { audio: buffer, fileName: media.name || `${dl.cleanName(title)}.mp3`, mimetype: "audio/mpeg" }, { quoted: msg });
    return kit.react(sock, msg, "✔");
  }
});
