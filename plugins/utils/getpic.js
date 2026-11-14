"use strict";

const kit = require("../../libs/pluginkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "pfp";

  const who = kit.getMentions(msg)[0] || kit.getQuoted(msg)?.sender || null;
  if (!who) {
    return kit.reply(sock, msg, "《✧》 Etiqueta o menciona al usuario del que quieras ver su foto de perfil.");
  }

  try {
    const img = await sock.profilePictureUrl(who, "image").catch(() => null);
    if (!img) {
      return sock.sendMessage(
        chatId,
        { text: `《✧》 No se pudo obtener la foto de perfil de @${who.split("@")[0]}.`, mentions: [who] },
        { quoted: msg }
      );
    }
    await sock.sendMessage(chatId, { image: { url: img } }, { quoted: msg });
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["pfp", "getpic"];
handler.description = "Ver la foto de perfil de un usuario.";
handler.category = "Utilidades";
module.exports = handler;
