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
    const job = yt.fetchAudio(url, info?.title);
    job.catch(() => {});
    if (info) {
      const views = Number(info.views || 0).toLocaleString("es-HN");
      const channel = info.author?.name || info.author || "Desconocido";
      const caption = `➩ Descargando › *${title}*\n\n> ❖ Canal › *${channel}*\n> ⴵ Duración › *${info.timestamp || "Desconocido"}*\n> ❀ Vistas › *${views}*\n> ✩ Publicado › *${info.ago || "Desconocido"}*\n> ❒ Enlace › *${url}*`;
      const thumb = info.image || info.thumbnail;
      if (thumb) await sock.sendMessage(chatId, { image: { url: thumb }, caption }, { quoted: msg }).catch(() => kit.reply(sock, msg, caption));
      else await kit.reply(sock, msg, caption);
    }
    const { media, audio } = await job;
    title = info?.title || media.meta?.title || title;
    const content = { audio: audio.buffer, fileName: `${dl.cleanName(title)}.${audio.ext}`, mimetype: audio.mimetype, ptt: false };
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await sock.sendMessage(chatId, content, { quoted: msg });
        break;
      } catch (e) {
        if (!String(e?.message).includes("Media upload failed on all hosts") || attempt === 3) throw e;
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }
    }
    return kit.react(sock, msg, "✔");
  }
});
