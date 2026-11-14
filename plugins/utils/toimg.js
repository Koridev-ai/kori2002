"use strict";

const fetch = require("node-fetch");
const FormData = require("form-data");
const cheerio = require("cheerio");
const kit = require("../../libs/pluginkit");

async function ezgifConvert(buffer, tool, selector, attr) {
  const form = new FormData();
  form.append("new-image-url", "");
  form.append("new-image", buffer, "image.webp");
  const res = await fetch(`https://ezgif.com/${tool}`, { method: "POST", body: form });
  const html = await res.text();
  const $ = cheerio.load(html);
  const form2 = new FormData();
  const fields = {};
  $("form input[name]").each((_, input) => {
    const name = $(input).attr("name");
    const value = $(input).val();
    fields[name] = value;
    form2.append(name, value);
  });
  if (!fields.file) throw new Error("ezgif no aceptó el sticker");
  const res2 = await fetch(`https://ezgif.com/${tool}/${fields.file}`, { method: "POST", body: form2 });
  const html2 = await res2.text();
  const $2 = cheerio.load(html2);
  const src = $2(selector).attr(attr);
  if (!src) throw new Error("ezgif no devolvió el archivo convertido");
  const outUrl = new URL(src, res2.url).toString();
  const outRes = await fetch(outUrl);
  return outRes.buffer();
}

const webp2mp4 = (buffer) => ezgifConvert(buffer, "webp-to-mp4", "div#output > p.outfile > video > source", "src");
const webp2png = (buffer) => ezgifConvert(buffer, "webp-to-png", "div#output > p.outfile > img", "src");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;

  const quoted = kit.getQuoted(msg);
  if (!quoted) {
    return kit.reply(sock, msg, "《✧》 Debes citar un sticker para convertir.");
  }

  const media = kit.getMedia(quoted.message);
  if (!media || media.type !== "sticker") {
    return kit.reply(sock, msg, "《✧》 Debes citar un sticker para convertir.");
  }

  await kit.react(sock, msg, "🕒");

  try {
    const buffer = await kit.downloadMedia(media);
    if (!buffer?.length) {
      await kit.react(sock, msg, "✖️");
      return kit.reply(sock, msg, "《✧》 No se pudo descargar el sticker.");
    }

    if (media.node.isAnimated) {
      const mp4Buffer = await webp2mp4(buffer);
      await sock.sendMessage(
        chatId,
        { video: mp4Buffer, caption: "ꕥ *Aquí tienes ฅ^•ﻌ•^ฅ*", gifPlayback: true },
        { quoted: msg }
      );
    } else {
      const pngBuffer = await webp2png(buffer);
      await sock.sendMessage(chatId, { image: pngBuffer, caption: "ꕥ *Aquí tienes ฅ^•ﻌ•^ฅ*" }, { quoted: msg });
    }
    await kit.react(sock, msg, "✔️");
  } catch (error) {
    await kit.react(sock, msg, "✖️");
    await kit.reply(sock, msg, `《✧》 Error al convertir el sticker.\n${error.message}`);
  }
};

handler.command = ["toimg", "toimage"];
handler.description = "Convertir un sticker a imagen o GIF.";
handler.category = "Utilidades";
module.exports = handler;
