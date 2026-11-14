"use strict";

const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "delpack";
  const args = (ctx.args || []).filter(Boolean);

  try {
    if (!args.length) {
      return kit.reply(sock, msg, "《✧》Especifica el nombre del paquete de stickers.");
    }
    const packName = args.join(" ").trim();
    const key = sk.userKey(ctx, msg);
    const packs = sk.getUserPacks(key);
    if (!packs.length) {
      return kit.reply(sock, msg, "《✧》No tienes paquetes creados.");
    }
    const index = packs.findIndex((p) => p.name.toLowerCase() === packName.toLowerCase());
    if (index === -1) {
      return kit.reply(sock, msg, `《✧》No se encontró el paquete de stickers \`${packName}\`.`);
    }
    const [deleted] = packs.splice(index, 1);
    sk.saveUserPacks(key, packs);
    await kit.reply(sock, msg, `❀ El paquete de stickers \`${deleted.name}\` ha sido eliminado.`);
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["delpack"];
handler.description = "Eliminar un paquete de stickers.";
handler.category = "Stickers";
module.exports = handler;
