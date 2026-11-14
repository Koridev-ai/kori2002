"use strict";

const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "delsticker";
  const args = (ctx.args || []).filter(Boolean);

  try {
    if (!args.length) {
      return kit.reply(sock, msg, "《✧》Especifica el nombre del paquete.");
    }
    const packName = args.join(" ").trim();
    const key = sk.userKey(ctx, msg);
    const packs = sk.getUserPacks(key);
    if (!packs.length) {
      return kit.reply(sock, msg, "《✧》No tienes paquetes creados.");
    }
    const pack = sk.findPack(packs, packName);
    if (!pack) {
      return kit.reply(sock, msg, "《✧》No se encontró un paquete con ese nombre.");
    }
    const quoted = kit.getQuoted(msg);
    if (!quoted) {
      return kit.reply(sock, msg, "《✧》Responde a un sticker para eliminarlo del paquete de stickers.");
    }
    const media = kit.getMedia(quoted.message);
    if (!media || media.type !== "sticker") {
      return kit.reply(sock, msg, "《✧》Solo puedes eliminar stickers.");
    }
    if (!pack.stickers || !pack.stickers.length) {
      return kit.reply(sock, msg, "《✧》El paquete no tiene stickers.");
    }
    const buffer = await kit.downloadMedia(media);
    if (!buffer) {
      return kit.reply(sock, msg, "《✧》No se pudo obtener el sticker.");
    }
    const index = pack.stickers.findIndex((stored) => stored === buffer.toString("base64"));
    if (index === -1) {
      return kit.reply(sock, msg, "《✧》Ese sticker no está en el paquete.");
    }
    pack.stickers.splice(index, 1);
    pack.lastModified = Date.now().toString();
    sk.saveUserPacks(key, packs);
    await kit.reply(sock, msg, `❀ El sticker ha sido eliminado del paquete de stickers ${pack.name}!`);
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["stickerdel", "delsticker"];
handler.description = "Eliminar un sticker de un paquete.";
handler.category = "Stickers";
module.exports = handler;
