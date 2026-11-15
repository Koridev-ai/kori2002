"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");

module.exports = gk.define({
  commands: ["hidetag", "tag"],
  description: "Enviar un mensaje mencionando a todos los usuarios del grupo.",
  admin: true,
  run: async ({ sock, msg, g, text }) => {
    const mentions = g.participants.map((p) => p.id).filter(Boolean);
    const quoted = kit.getQuoted(msg);
    const source = quoted ? quoted.message : kit.unwrap(msg.message);
    const media = kit.getMedia(source);
    const original = kit.getText(source).trim();
    const caption = (quoted ? original : text) || "";
    const options = { mentions };

    if (media && ["image", "video"].includes(media.type)) {
      const buffer = await kit.downloadMedia(media);
      if (media.type === "image") return sock.sendMessage(g.chatId, { image: buffer, ...(caption ? { caption } : {}), ...options });
      return sock.sendMessage(g.chatId, { video: buffer, mimetype: "video/mp4", ...(caption ? { caption } : {}), ...options });
    }
    if (media && media.type === "audio") {
      const buffer = await kit.downloadMedia(media);
      return sock.sendMessage(g.chatId, { audio: buffer, mimetype: "audio/mp4", fileName: "hidetag.mp3", ...options });
    }
    if (media && media.type === "sticker") {
      const buffer = await kit.downloadMedia(media);
      return sock.sendMessage(g.chatId, { sticker: buffer, ...options });
    }
    const finalText = quoted && original ? original : text;
    if (finalText) return sock.sendMessage(g.chatId, { text: finalText, ...options });
    return kit.reply(sock, msg, "《✧》 *Ingresa* un texto o *responde* a uno");
  }
});
