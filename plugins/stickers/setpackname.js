"use strict";

const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "setpackname";
  const args = (ctx.args || []).filter(Boolean);
  const usage = `《✧》Especifica el nombre del paquete y el nuevo nombre.\n> Ejemplo: *${usedPrefix + command} NombreActual | NuevoNombre*`;

  try {
    if (!args.length) return kit.reply(sock, msg, usage);
    const parts = args.join(" ").trim().split(/\||•|\//);
    if (parts.length < 2) return kit.reply(sock, msg, usage);
    const packName = parts[0].trim();
    const newName = parts[1].trim();
    if (!newName) {
      return kit.reply(sock, msg, "《✧》El nuevo nombre no puede estar vacío.");
    }
    if (newName.length < 4 || newName.length > 64) {
      return kit.reply(sock, msg, "《✧》El nuevo nombre debe tener entre 4 y 64 caracteres.");
    }
    const key = sk.userKey(ctx, msg);
    const packs = sk.getUserPacks(key);
    if (!packs.length) {
      return kit.reply(sock, msg, "《✧》No tienes paquetes creados.");
    }
    if (sk.findPack(packs, newName)) {
      return kit.reply(sock, msg, "《✧》Ya tienes un paquete con ese nombre.");
    }
    const pack = sk.findPack(packs, packName);
    if (!pack) {
      return kit.reply(sock, msg, `《✧》No se encontró el paquete de stickers \`${packName}\`.`);
    }
    pack.name = newName;
    pack.lastModified = Date.now().toString();
    sk.saveUserPacks(key, packs);
    await kit.reply(sock, msg, `❀ El paquete de stickers \`${packName}\` ahora se llama \`${newName}\`!`);
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["setstickerpackname", "setpackname", "packname"];
handler.description = "Cambiar el nombre de un paquete de stickers.";
handler.category = "Stickers";
module.exports = handler;
