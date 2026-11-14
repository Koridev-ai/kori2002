"use strict";

const kit = require("../../libs/pluginkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "say";

  try {
    const groupMetadata = isGroup ? await sock.groupMetadata(chatId).catch(() => null) : null;
    const allMentions = (groupMetadata?.participants || []).map((p) => p.id).filter(Boolean);
    const userText = (ctx.args || []).join(" ").trim();

    const quoted = kit.getQuoted(msg);
    const source = quoted ? quoted.message : kit.unwrap(msg.message);
    const media = kit.getMedia(source);
    const originalText = kit.getText(source).trim();
    const textToCheck = (userText || originalText || "").trim();
    const explicitMentions = allMentions.filter((jid) => textToCheck.includes(jid.split("@")[0]));
    const options = { mentions: explicitMentions };

    if (media && media.type === "image") {
      const buffer = await kit.downloadMedia(media);
      return sock.sendMessage(chatId, { image: buffer, caption: textToCheck || "", ...options });
    }
    if (media && media.type === "video") {
      const buffer = await kit.downloadMedia(media);
      return sock.sendMessage(chatId, { video: buffer, mimetype: "video/mp4", caption: textToCheck || "", ...options });
    }
    if (media && media.type === "audio") {
      const buffer = await kit.downloadMedia(media);
      return sock.sendMessage(chatId, { audio: buffer, mimetype: "audio/mp4", fileName: "hidetag.mp3", ...options });
    }
    if (media && media.type === "sticker") {
      const buffer = await kit.downloadMedia(media);
      return sock.sendMessage(chatId, { sticker: buffer, ...options });
    }
    if (textToCheck) {
      return sock.sendMessage(chatId, { text: textToCheck, ...options });
    }
    return kit.reply(sock, msg, "《✧》 Por favor, escribe el texto que deseas repetir.");
  } catch (e) {
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["say", "decir"];
handler.description = "Repetir un mensaje como el bot.";
handler.category = "Utilidades";
module.exports = handler;
