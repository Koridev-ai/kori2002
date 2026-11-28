"use strict";

const kit = require("../../libs/pluginkit");
const botconf = require("../../libs/botconf");
const gmeta = require("../../libs/gmeta");

const ZERO_WIDTH = "";
const WINDOW_MS = 10000;
const MAX_PER_WINDOW = 4;
const MAX_TRACKED_IDS = 300;
const MAX_TRACKED_CHATS = 200;

const sentIds = new Set();
const windows = new Map();

function rememberSent(result) {
  const id = result?.key?.id;
  if (!id) return;
  if (sentIds.size >= MAX_TRACKED_IDS) sentIds.delete(sentIds.values().next().value);
  sentIds.add(id);
}

function neutralize(text, botId) {
  const raw = String(text || "");
  const matched = botconf.match(botId, raw.trimStart());
  if (!matched) return raw;
  const command = matched.body.trim().split(/\s+/)[0] || "";
  if (!command || !require("../../main").hasCommand(command.toLowerCase())) return raw;
  return ZERO_WIDTH + raw;
}

function throttle(chatId) {
  const now = Date.now();
  let entry = windows.get(chatId);
  if (!entry || now - entry.start > WINDOW_MS) {
    if (!entry && windows.size >= MAX_TRACKED_CHATS) windows.delete(windows.keys().next().value);
    entry = { start: now, count: 0, warned: false };
    windows.set(chatId, entry);
  }
  entry.count++;
  if (entry.count <= MAX_PER_WINDOW) return "ok";
  if (entry.warned) return "silent";
  entry.warned = true;
  return "warn";
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "say";
  const botId = ctx.botId || botconf.number(sock.user?.id);

  try {
    if (msg.key.id && sentIds.has(msg.key.id)) return;

    const verdict = throttle(chatId);
    if (verdict === "silent") return;
    if (verdict === "warn") return kit.reply(sock, msg, "《✧》 Demasiados mensajes seguidos con *say*. Espera unos segundos antes de volver a usarlo.");

    const groupMetadata = isGroup ? await gmeta.get(sock, chatId) : null;
    const allMentions = (groupMetadata?.participants || []).map((p) => p.id).filter(Boolean);
    const userText = (ctx.args || []).join(" ").trim();

    const quoted = kit.getQuoted(msg);
    const source = quoted ? quoted.message : kit.unwrap(msg.message);
    const media = kit.getMedia(source);
    const originalText = quoted ? kit.getText(source).trim() : "";
    const textToCheck = neutralize(userText || originalText || "", botId).trim();
    const explicitMentions = allMentions.filter((jid) => textToCheck.includes(jid.split("@")[0]));
    const options = { mentions: explicitMentions };
    const caption = textToCheck === ZERO_WIDTH ? "" : textToCheck;

    const send = async (payload) => {
      const result = await sock.sendMessage(chatId, payload);
      rememberSent(result);
      return result;
    };

    if (media && media.type === "image") {
      const buffer = await kit.downloadMedia(media);
      return send({ image: buffer, caption, ...options });
    }
    if (media && media.type === "video") {
      const buffer = await kit.downloadMedia(media);
      return send({ video: buffer, mimetype: "video/mp4", caption, ...options });
    }
    if (media && media.type === "audio") {
      const buffer = await kit.downloadMedia(media);
      return send({ audio: buffer, mimetype: "audio/mp4", fileName: "hidetag.mp3", ...options });
    }
    if (media && media.type === "sticker") {
      const buffer = await kit.downloadMedia(media);
      return send({ sticker: buffer, ...options });
    }
    if (textToCheck) {
      return send({ text: textToCheck, ...options });
    }
    return kit.reply(sock, msg, "《✧》 Por favor, escribe el texto que deseas repetir.");
  } catch (e) {
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["say", "decir"];
handler.description = "Repetir un mensaje como el bot.";
handler.category = "Utilidades";
module.exports = handler;
