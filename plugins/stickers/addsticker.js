"use strict";

const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "addsticker";
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
      return kit.reply(sock, msg, "《✧》Responde a un sticker.");
    }
    const media = kit.getMedia(quoted.message);
    if (!media || media.type !== "sticker") {
      return kit.reply(sock, msg, "《✧》Solo puedes agregar stickers.");
    }
    if (pack.stickers.length >= 50) {
      return kit.reply(sock, msg, "《✧》Un paquete no puede tener más de 50 stickers.");
    }
    const buffer = await kit.downloadMedia(media);
    if (!buffer) {
      return kit.reply(sock, msg, "《✧》No se pudo descargar el sticker.");
    }
    if (buffer.length === 0) {
      return kit.reply(sock, msg, "《✧》El sticker está vacío o corrupto.");
    }
    const base64Sticker = buffer.toString("base64");
    if (pack.stickers.includes(base64Sticker)) {
      return kit.reply(sock, msg, `《✧》El sticker ya existe en el paquete de stickers \`${pack.name}\`.`);
    }
    pack.stickers.push(base64Sticker);
    pack.lastModified = Date.now().toString();
    sk.saveUserPacks(key, packs);
    await kit.reply(sock, msg, `《✧》Sticker agregado al pack \`${pack.name}\` correctamente!`);
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["addsticker", "stickeradd"];
handler.description = "Agregar un sticker a un paquete.";
handler.category = "Stickers";
module.exports = handler;
