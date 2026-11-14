"use strict";

const axios = require("axios");
const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

const TENOR_KEY = "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ";

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "emojimix";
  const text = (ctx.args || []).join(" ").trim();

  if (!text) {
    return kit.reply(sock, msg, `《✧》 Ingresa 2 emojis para combinar.\n> Ejemplo: *${usedPrefix + command}* 👻+👀`);
  }

  try {
    const [emoji1, emoji2] = text.split("+").map((part) => part.trim());
    if (!emoji1 || !emoji2) {
      return kit.reply(sock, msg, `《✧》 Ingresa 2 emojis para combinar.\n> Ejemplo: *${usedPrefix + command}* 👻+👀`);
    }
    await kit.react(sock, msg, "🕒");

    const res = await axios.get("https://tenor.googleapis.com/v2/featured", {
      params: {
        key: TENOR_KEY,
        contentfilter: "high",
        media_filter: "png_transparent",
        component: "proactive",
        collection: "emoji_kitchen_v5",
        q: `${emoji1}_${emoji2}`
      },
      timeout: 30000
    });
    const results = res.data?.results || [];
    if (!results.length) {
      throw new Error("《✧》 No se encontraron stickers para esos emojis.");
    }

    for (const result of results) {
      const image = await axios.get(result.url, { responseType: "arraybuffer", timeout: 30000 });
      const webpBuffer = await sk.encodeWebp(Buffer.from(image.data), { ext: "png" });
      await sk.sendWithMeta(sock, msg, ctx, webpBuffer);
    }
    await kit.react(sock, msg, "✔️");
  } catch (e) {
    await kit.react(sock, msg, "✖️");
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["emojimix"];
handler.description = "Mezclar dos emojis en un sticker.";
handler.category = "Stickers";
module.exports = handler;
