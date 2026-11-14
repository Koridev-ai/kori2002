"use strict";

const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "newpack";

  try {
    const dev = msg.pushName || "Desconocido";
    const name = (ctx.args || []).join(" ").trim();
    if (!name || name.length < 4 || name.length > 64) {
      return kit.reply(sock, msg, "《✧》El nombre del paquete de stickers debe tener entre 4 y 64 caracteres.");
    }
    const key = sk.userKey(ctx, msg);
    const packs = sk.getUserPacks(key);
    if (sk.findPack(packs, name)) {
      return kit.reply(sock, msg, "《✧》Ya tienes un paquete con ese nombre.");
    }
    packs.push({
      id: Date.now().toString(),
      lastModified: Date.now().toString(),
      name,
      author: sock.user?.name || "Rem",
      desc: `Paquete de stickers creado por ${dev}`,
      stickers: [],
      spackpublic: 0
    });
    sk.saveUserPacks(key, packs);
    await kit.reply(
      sock,
      msg,
      `《✧》El paquete de stickers \`${name}\` ha sido creado exitosamente!\n> Puedes agregar stickers respondiendo a uno usando *${usedPrefix}addsticker ${name}*!`
    );
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["newpack", "newstickerpack"];
handler.description = "Crear un nuevo paquete de stickers.";
handler.category = "Stickers";
module.exports = handler;
