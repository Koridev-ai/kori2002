"use strict";

const kit = require("../../libs/pluginkit");

const LINK_REGEX = /whatsapp\.com\/channel\/([0-9A-Za-z]{10,40})/i;

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "idcanal";

  try {
    const input = (ctx.args || []).join(" ").trim();
    if (!input) return kit.reply(sock, msg, `《✧》 Ingresa el enlace del canal.\n> Ejemplo: *${usedPrefix}${command} https://whatsapp.com/channel/xxxx*`);

    const match = input.match(LINK_REGEX);
    if (!match) return kit.reply(sock, msg, "《✧》 El enlace del canal no es válido.");

    const meta = await sock.newsletterMetadata("invite", match[1]);
    if (!meta?.id) return kit.reply(sock, msg, "《✧》 No se pudo obtener la información del canal.");

    const name = meta.name || meta.thread_metadata?.name?.text || "Desconocido";
    const text = `❀ *Información del canal*\n\n> ✐ Nombre › *${name}*\n> ✿ ID › *${meta.id}*`;
    return kit.reply(sock, msg, text);
  } catch (e) {
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["idcanal", "newsletterid", "idch"];
handler.description = "Obtener el ID (newsletter) de un canal con su enlace.";
handler.category = "Utilidades";
module.exports = handler;
