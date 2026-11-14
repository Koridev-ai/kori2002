"use strict";

const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "setpackpublic";
  const args = (ctx.args || []).filter(Boolean);

  try {
    if (!args.length) {
      return kit.reply(sock, msg, "《✧》Debes especificar el nombre del paquete de stickers.");
    }
    const packName = args.join(" ").trim();
    const key = sk.userKey(ctx, msg);
    const packs = sk.getUserPacks(key);
    if (!packs.length) {
      return kit.reply(sock, msg, "《✧》No tienes paquetes creados.");
    }
    const pack = sk.findPack(packs, packName);
    if (!pack) {
      return kit.reply(sock, msg, `《✧》No se encontró el paquete de stickers \`${packName}\`.`);
    }
    if (pack.spackpublic === 1) {
      return kit.reply(sock, msg, `《✧》El paquete de stickers \`${pack.name}\` ya es público.`);
    }
    pack.spackpublic = 1;
    pack.lastModified = Date.now().toString();
    sk.saveUserPacks(key, packs);
    await kit.reply(sock, msg, `❀ El paquete de stickers \`${pack.name}\` ha sido establecido como público!`);
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["setpackpublic", "setpackpub", "packpublic"];
handler.description = "Establecer un paquete de stickers como público.";
handler.category = "Stickers";
module.exports = handler;
