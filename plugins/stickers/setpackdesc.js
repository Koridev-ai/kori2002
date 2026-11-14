"use strict";

const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "setpackdesc";
  const args = (ctx.args || []).filter(Boolean);
  const usage = `《✧》Especifica el nombre del paquete y la nueva descripción.\n> Ejemplo: *${usedPrefix + command} NombreDelPaquete | Nueva Descripción*`;

  try {
    if (!args.length) return kit.reply(sock, msg, usage);
    const parts = args.join(" ").trim().split(/\||•|\//);
    if (parts.length < 2) return kit.reply(sock, msg, usage);
    const packName = parts[0].trim();
    const desc = parts[1].trim();
    if (!desc) {
      return kit.reply(sock, msg, "《✧》La descripción no puede estar vacía.");
    }
    if (desc.length > 60) {
      return kit.reply(sock, msg, "《✧》La descripción no puede tener más de 60 caracteres.");
    }
    const key = sk.userKey(ctx, msg);
    const packs = sk.getUserPacks(key);
    if (!packs.length) {
      return kit.reply(sock, msg, "《✧》No tienes paquetes creados.");
    }
    const pack = sk.findPack(packs, packName);
    if (!pack) {
      return kit.reply(sock, msg, `《✧》No se encontró el paquete de stickers \`${packName}\`.`);
    }
    pack.desc = desc;
    pack.lastModified = Date.now().toString();
    sk.saveUserPacks(key, packs);
    await kit.reply(sock, msg, `❀ La descripción del paquete de stickers \`${pack.name}\` ha sido actualizada!`);
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["setstickerpackdesc", "setpackdesc", "packdesc"];
handler.description = "Establecer la descripción de un paquete de stickers.";
handler.category = "Stickers";
module.exports = handler;
