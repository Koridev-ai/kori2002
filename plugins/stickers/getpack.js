"use strict";

const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

const MAX_STICKERS = 50;

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "getpack";
  const args = (ctx.args || []).filter(Boolean);

  try {
    if (!args.length) {
      return kit.reply(sock, msg, "《✧》Especifica el nombre del paquete de stickers.");
    }
    const packName = args.join(" ").trim();
    const key = sk.userKey(ctx, msg);
    let pack = sk.findPack(sk.getUserPacks(key), packName);
    let owner = key;

    if (!pack) {
      const found = sk.findPublicPack(packName);
      if (found) {
        pack = found.pack;
        owner = found.owner;
      }
    }

    if (!pack) {
      return kit.reply(sock, msg, "《✧》No se encontró un paquete con ese nombre.");
    }
    if (!Array.isArray(pack.stickers) || pack.stickers.length < 1) {
      return kit.reply(sock, msg, `《✧》El paquete \`${pack.name}\` no tiene suficientes stickers.`);
    }

    const validStickers = pack.stickers
      .map((s) => {
        try {
          return Buffer.from(s, "base64");
        } catch {
          return null;
        }
      })
      .filter((s) => s && Buffer.isBuffer(s) && s.length > 0);

    if (validStickers.length < 1) {
      return kit.reply(sock, msg, "《✧》Algunos stickers están corruptos.");
    }

    await kit.react(sock, msg, "🕒");

    const selected = validStickers.slice(0, MAX_STICKERS);
    const ownerMeta = sk.getMeta(owner);
    const stickerPackname = ownerMeta.pack ? ownerMeta.pack : pack.name;
    const stickerAuthor = ownerMeta.pack ? ownerMeta.author || "" : pack.desc;

    const stickerResults = await Promise.all(
      selected.map(async (buffer) => {
        try {
          const withExif = await sk.addExif(buffer, stickerPackname, stickerAuthor, ["🎭"]);
          return { sticker: withExif, isAnimated: sk.isAnimatedWebp(buffer), isLottie: false, emojis: ["🎭"] };
        } catch {
          return { sticker: buffer, isAnimated: false, isLottie: false, emojis: ["🎭"] };
        }
      })
    );

    const stickerPack = {
      name: pack.name,
      publisher: `${pack.author} (${owner})`,
      description: pack.desc,
      cover: selected[0],
      stickers: stickerResults
    };

    const mode = await sk.sendStickerPackOrFallback(
      sock,
      chatId,
      msg,
      stickerPack,
      stickerResults.map((s) => s.sticker),
      stickerPackname,
      stickerAuthor
    );
    if (mode === "none") throw new Error("No se pudo enviar el paquete");
    await kit.react(sock, msg, "✔️");
  } catch (e) {
    await kit.react(sock, msg, "✖️");
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["getpack", "pack", "stickerpack"];
handler.description = "Descargar un paquete de stickers.";
handler.category = "Stickers";
module.exports = handler;
