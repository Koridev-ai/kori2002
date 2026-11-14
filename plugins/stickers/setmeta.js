"use strict";

const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "setmeta";
  const args = (ctx.args || []).filter(Boolean);

  if (!args.length) {
    return kit.reply(sock, msg, "《✧》 Por favor, ingresa los metadatos que deseas asignar a tus stickers.");
  }

  try {
    const fullArgs = args.join(" ");
    const separatorIndex = fullArgs.search(/[|•\/]/);
    let pack;
    let author;
    if (separatorIndex === -1) {
      pack = fullArgs.trim();
      author = "";
    } else {
      pack = fullArgs.slice(0, separatorIndex).trim();
      author = fullArgs.slice(separatorIndex + 1).trim();
    }
    if (!pack) {
      return kit.reply(sock, msg, "《✧》 El nombre del pack no puede estar vacío.");
    }
    sk.setMeta(sk.userKey(ctx, msg), pack, author);
    await kit.reply(sock, msg, "✎ Los metadatos de tus stickers se han actualizado correctamente.");
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["setstickermeta", "setmeta"];
handler.description = "Establecer el pack y autor por defecto para tus stickers.";
handler.category = "Stickers";
module.exports = handler;
