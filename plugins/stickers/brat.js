"use strict";

const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");
const brat = require("../../libs/bratkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "brat";

  try {
    const quoted = kit.getQuoted(msg);
    const text = (kit.getText(quoted?.message) || (ctx.args || []).join(" ")).trim();
    if (!text) {
      return kit.reply(sock, msg, "《✧》 Por favor, responde a un mensaje o ingresa un texto para crear el Sticker.");
    }
    await kit.react(sock, msg, "🕒");
    const webpBuffer = await brat.staticWebp(text);
    await sk.sendWithMeta(sock, msg, ctx, webpBuffer);
    await kit.react(sock, msg, "✔️");
  } catch (e) {
    await kit.react(sock, msg, "✖️");
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["brat"];
handler.description = "Crear un sticker estilo brat con texto.";
handler.category = "Stickers";
module.exports = handler;
