"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");
const nsfw = require("../../libs/nsfwkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "nsfw";
  const option = String((ctx.args || [])[0] || "").toLowerCase();

  try {
    const enabled = nsfw.isEnabled(chatId);
    if (!["on", "off", "enable", "disable", "1", "0"].includes(option)) {
      return kit.reply(
        sock,
        msg,
        `ꕥ El contenido *NSFW* está *${enabled ? "activado" : "desactivado"}* en este chat.\n\n> Usa » *${usedPrefix + command} on* o *${usedPrefix + command} off*`
      );
    }
    const allowed = pdb.isOwner(msg, ctx.sender) || (await nsfw.isAdmin(sock, msg));
    if (!allowed) return kit.reply(sock, msg, "《✧》 Solo los *administradores* pueden cambiar esta opción.");
    const value = ["on", "enable", "1"].includes(option);
    if (value === enabled) {
      return kit.reply(sock, msg, `《✧》 El contenido *NSFW* ya estaba *${value ? "activado" : "desactivado"}*.`);
    }
    nsfw.setEnabled(chatId, value);
    return kit.reply(sock, msg, `✦ El contenido *NSFW* fue *${value ? "activado" : "desactivado"}* en este chat.`);
  } catch (e) {
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["nsfw"];
handler.description = "Activar o desactivar los comandos NSFW del chat.";
handler.category = "NSFW";
module.exports = handler;
