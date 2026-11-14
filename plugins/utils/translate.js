"use strict";

const axios = require("axios");
const kit = require("../../libs/pluginkit");

async function googleTranslate(text, to) {
  const res = await axios.get("https://translate.googleapis.com/translate_a/single", {
    params: { client: "gtx", sl: "auto", tl: to, dt: "t", q: text },
    timeout: 30000
  });
  const parts = res.data?.[0];
  if (!Array.isArray(parts)) throw new Error("Respuesta inválida del traductor");
  const translated = parts.map((part) => part?.[0] || "").join("");
  if (!translated) throw new Error("No se obtuvo traducción");
  return translated;
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "translate";
  const args = (ctx.args || []).filter(Boolean);
  const defaultLang = "es";
  const quoted = kit.getQuoted(msg);

  if (!args[0] && !quoted) {
    return kit.reply(sock, msg, "《✧》 Ingresa el idioma seguido del texto que quieras traducir.");
  }

  let lang = args[0];
  let text = "";

  if (quoted) {
    text = kit.getText(quoted.message);
    if ((lang || "").length === 2 && args[1]) {
      text = args.slice(1).join(" ") || text;
    } else if ((lang || "").length === 2) {
      lang = args[0];
    } else {
      lang = defaultLang;
      text = args.join(" ") || text;
    }
  } else if ((lang || "").length === 2) {
    text = args.slice(1).join(" ");
  } else {
    lang = defaultLang;
    text = args.join(" ");
  }

  if (!text.trim()) {
    return kit.reply(sock, msg, "《✧》 No hay texto para traducir.");
  }

  try {
    await kit.react(sock, msg, "🕒");
    const result = await googleTranslate(text, lang.toLowerCase());
    await sock.sendMessage(chatId, { text: result }, { quoted: msg });
    await kit.react(sock, msg, "✔️");
  } catch (e) {
    await kit.react(sock, msg, "✖️");
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["translate", "trad", "traducir"];
handler.description = "Traducir texto al idioma especificado.";
handler.category = "Utilidades";
module.exports = handler;
