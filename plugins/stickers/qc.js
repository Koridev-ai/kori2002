"use strict";

const axios = require("axios");
const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

const DEFAULT_PFP = "https://telegra.ph/file/24fa902ead26340f3df2c.png";

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "qc";

  try {
    const quoted = kit.getQuoted(msg);
    const textFinal = (ctx.args || []).join(" ").trim() || kit.getText(quoted?.message).trim();
    if (!textFinal) {
      return kit.reply(sock, msg, "《✧》 Ingresa un texto para crear el sticker.");
    }

    const target = quoted?.sender || sk.senderJid(msg);
    const pp = await sock.profilePictureUrl(target, "image").catch(() => DEFAULT_PFP);
    const nombre = quoted ? target.split("@")[0] : msg.pushName || target.split("@")[0];

    if (textFinal.length > 30) {
      await kit.react(sock, msg, "✖️");
      return kit.reply(sock, msg, "《✧》 El texto no puede tener más de 30 caracteres.");
    }

    await kit.react(sock, msg, "🕒");
    const quoteObj = {
      type: "quote",
      format: "png",
      backgroundColor: "#000000",
      width: 512,
      height: 768,
      scale: 2,
      messages: [{ entities: [], avatar: true, from: { id: 1, name: nombre, photo: { url: pp } }, text: textFinal, replyMessage: {} }]
    };
    const res = await axios.post("https://bot.lyo.su/quote/generate", quoteObj, {
      headers: { "Content-Type": "application/json" },
      timeout: 45000
    });
    const image = res.data?.result?.image;
    if (!image) throw new Error("La API no devolvió la imagen");

    const webpBuffer = await sk.encodeWebp(Buffer.from(image, "base64"), { ext: "png" });
    await sk.sendWithMeta(sock, msg, ctx, webpBuffer);
    await kit.react(sock, msg, "✔️");
  } catch (e) {
    await kit.react(sock, msg, "✖️");
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["qc"];
handler.description = "Crear un sticker con texto estilo quote.";
handler.category = "Stickers";
module.exports = handler;
