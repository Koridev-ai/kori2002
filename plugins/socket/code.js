"use strict";

const kit = require("../../libs/pluginkit");
const lid = require("../../libs/lid");
const botconf = require("../../libs/botconf");
const subbot = require("../../libs/subbot");

function msToTime(ms) {
  const total = Math.ceil(Math.abs(ms) / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes > 0 ? `${minutes} minuto${minutes !== 1 ? "s" : ""} y ${seconds} segundo${seconds !== 1 ? "s" : ""}` : `${seconds} segundo${seconds !== 1 ? "s" : ""}`;
}

async function requesterNumber(sock, msg, ctx) {
  if (msg.key.fromMe) return botconf.number(sock.user?.id);
  const raw = msg.key.participant || msg.key.remoteJid;
  const resolved = await lid.resolve(sock, raw, msg).catch(() => raw);
  if (lid.isLid(resolved)) return "";
  return botconf.number(resolved) || String(ctx.sender || "").replace(/\D/g, "");
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix !== undefined ? ctx.usedPrefix : global.prefix || ".";
  const command = ctx.command || "code";
  const chatId = msg.key.remoteJid;

  try {
    const sender = String(ctx.sender || "");
    const left = subbot.cooldownLeft(sender);
    if (left > 0) return await kit.reply(sock, msg, `ꕥ Debes esperar *${msToTime(left)}* para volver a intentar vincular un socket.`);

    const typed = subbot.normalizePhone((ctx.args || []).join(""));
    const number = typed || (await requesterNumber(sock, msg, ctx));
    if (!number) {
      return await kit.reply(sock, msg, `✐ No pude detectar tu número.\n> Escríbelo con código de país, por ejemplo: *${usedPrefix}${command} 573001234567*`);
    }
    if (!subbot.isValidPhone(number)) {
      return await kit.reply(sock, msg, `✐ Número inválido.\n> Escríbelo con código de país y sin símbolos, por ejemplo: *${usedPrefix}${command} 573001234567*`);
    }

    const active = subbot.findEntry(number);
    if (active && active.status === "open") {
      return await kit.reply(sock, msg, "✐ Ese número ya tiene un *Sub-Bot* activo.");
    }

    const saved = subbot.savedSessions().includes(number);
    if (saved && !active) {
      await subbot.startSub({ number });
      subbot.markCooldown(sender);
      return await kit.reply(sock, msg, "✿ Se encontró una sesión guardada de ese número, reactivando el *Sub-Bot*...");
    }

    const mode = command === "qr" ? "qr" : "code";
    await subbot.startSub({ number, mode, notify: { sock, chatId, quoted: msg } });
    subbot.markCooldown(sender);
  } catch (error) {
    return kit.reply(sock, msg, `✐ ${error?.message || error}`);
  }
};

handler.command = ["code", "qr"];
handler.description = "Vincular un Sub-Bot con código o QR.";
handler.category = "Sub-Bot";
module.exports = handler;
