"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");
const main = require("../../libs/mainkit");

const LINK_REGEX = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;
const COOLDOWN_MS = 3600000;

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "invite";

  try {
    const jid = pdb.selfJid(msg);
    const user = pdb.get(jid);
    const last = user.inviteCooldown || 0;
    const remaining = last + COOLDOWN_MS - Date.now();
    if (remaining > 0) {
      return kit.reply(sock, msg, `ꕥ Espera *${main.msToTime(remaining)}* para volver a enviar otra invitación.`);
    }

    const args = ctx.args || [];
    const link = args.join(" ").trim();
    if (!link) return kit.reply(sock, msg, "《✧》 Ingresa el enlace para invitar al bot a tu grupo.");
    const match = link.match(LINK_REGEX);
    if (!match) return kit.reply(sock, msg, "《✧》 El enlace ingresado no es válido o está incompleto.");

    let chatName = "Chat privado";
    if (chatId.endsWith("@g.us")) {
      const meta = await sock.groupMetadata(chatId).catch(() => null);
      chatName = meta?.subject || "Grupo desconocido";
    }

    const botName = sock.user?.name || "Bot";
    const request = `❀ 𝗦𝗢𝗟𝗜𝗖𝗜𝗧𝗨𝗗 𝗥𝗘𝗖𝗜𝗕𝗜𝗗𝗔

✩ *Usuario ›* ${user.name || msg.pushName || "Usuario"}
✿ *Enlace ›* ${link}
✿ *Chat ›* ${chatName}

➤ 𝗜𝗡𝗙𝗢 𝗕𝗢𝗧
★ *Nombre ›* ${botName}`;

    const delivered = await main.notifyOwners(sock, request);
    if (!delivered) return kit.reply(sock, msg, "《✧》 No se pudo enviar la invitación, intenta más tarde.");

    pdb.set(jid, "inviteCooldown", Date.now());
    return kit.reply(sock, msg, "❀ El enlace fue enviado correctamente. ¡Gracias por tu invitación! ฅ^•ﻌ•^ฅ");
  } catch (e) {
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["invite", "invitar"];
handler.description = "Invitar el bot a un grupo.";
handler.category = "General";
module.exports = handler;
