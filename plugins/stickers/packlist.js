"use strict";

const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

function formatDate(timestamp) {
  const date = new Date(parseInt(timestamp));
  return date.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "packlist";

  try {
    const jid = sk.senderJid(msg);
    const packs = sk.getUserPacks(sk.userKey(ctx, msg));
    if (!packs.length) {
      return kit.reply(sock, msg, "《✧》No tienes paquetes de stickers creados.");
    }
    let text = "*❀ Lista de tus paquetes de stickers:*\n";
    text += `> ❏ Total: \`${packs.length}\`\n`;
    text += `> ❏ Usuario: @${jid.split("@")[0]}\n\n`;
    for (const pack of packs) {
      const estado = pack.spackpublic === 1 ? "Público" : "Privado";
      text += `❖ *${pack.name || "Sin nombre"}*\n`;
      text += `> » Stickers: \`${pack.stickers?.length || 0}\`\n`;
      text += `> » Modificado: \`${formatDate(pack.lastModified || pack.id)}\`\n`;
      text += `> » Estado: \`${estado}\`\n\n`;
    }
    await sock.sendMessage(chatId, { text, mentions: [jid] }, { quoted: msg });
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["packlist", "stickerpacks"];
handler.description = "Listar tus paquetes de stickers.";
handler.category = "Stickers";
module.exports = handler;
