"use strict";

const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");
const brat = require("../../libs/bratkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "bratv";

  try {
    const quoted = kit.getQuoted(msg);
    const text = (kit.getText(quoted?.message) || (ctx.args || []).join(" ")).trim();
    if (!text) {
      return kit.reply(sock, msg, "《✧》 Por favor, responde a un mensaje o ingresa un texto para crear el Sticker.");
    }
    await kit.react(sock, msg, "🕒");
    const webpBuffer = await brat.animatedWebp(text);
    await sk.sendWithMeta(sock, msg, ctx, webpBuffer);
    await kit.react(sock, msg, "✔️");
  } catch (e) {
    await kit.react(sock, msg, "✖️");
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["bratv"];
handler.description = "Crear un video-sticker estilo brat.";
handler.category = "Stickers";
module.exports = handler;
