"use strict";

const kit = require("../../libs/pluginkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "read";

  const quoted = kit.getQuoted(msg);
  if (!quoted) {
    return kit.reply(sock, msg, '《✧》 Por favor, responde a un mensaje "ViewOnce" para ver su contenido.');
  }

  try {
    await kit.react(sock, msg, "🕒");
    const media = kit.getMedia(quoted.message);
    if (!media || !["image", "video", "audio"].includes(media.type)) {
      await kit.react(sock, msg, "✖️");
      return kit.reply(sock, msg, "《✧》 No se pudo extraer el contenido.");
    }

    const buffer = await kit.downloadMedia(media);
    if (!buffer?.length) {
      await kit.react(sock, msg, "✖️");
      return kit.reply(sock, msg, "《✧》 No se pudo descargar el contenido.");
    }

    const caption = media.node.caption || "";
    if (media.type === "video") {
      await sock.sendMessage(chatId, { video: buffer, caption, mimetype: "video/mp4" }, { quoted: msg });
    } else if (media.type === "image") {
      await sock.sendMessage(chatId, { image: buffer, caption }, { quoted: msg });
    } else {
      await sock.sendMessage(
        chatId,
        { audio: buffer, mimetype: "audio/ogg; codecs=opus", ptt: media.node.ptt || false },
        { quoted: msg }
      );
    }
    await kit.react(sock, msg, "✔️");
  } catch (e) {
    await kit.react(sock, msg, "✖️");
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["readviewonce", "read", "readvo"];
handler.description = "Convertir imagen/video de una vista a contenido.";
handler.category = "Utilidades";
module.exports = handler;
