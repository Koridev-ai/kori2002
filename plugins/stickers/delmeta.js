"use strict";

const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "delmeta";

  try {
    const key = sk.userKey(ctx, msg);
    const meta = sk.getMeta(key);
    if (!meta.pack && !meta.author) {
      return kit.reply(sock, msg, "《✧》No tienes metadatos asignados.");
    }
    sk.delMeta(key);
    await kit.reply(sock, msg, "✎ Los metadatos de tus stickers se han eliminado correctamente.");
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["delmeta", "delstickermeta"];
handler.description = "Restablecer el pack y autor por defecto para tus stickers.";
handler.category = "Stickers";
module.exports = handler;
