"use strict";

const kit = require("../../libs/pluginkit");
const botconf = require("../../libs/botconf");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix !== undefined ? ctx.usedPrefix : global.prefix || ".";
  const command = ctx.command || "bots";
  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");

  try {
    const isAll = String((ctx.args || [])[0] || "").toLowerCase() === "all" || !isGroup;
    const online = botconf.list().filter((b) => b.online && b.getSock?.()?.user);
    const shown = isAll ? online : await botconf.candidatesIn(sock, chatId, ctx.botId);

    const mains = online.filter((b) => b.isMain);
    const subs = online.filter((b) => !b.isMain);
    const lines = { Owner: [], Sub: [] };
    const mentions = [];

    for (const bot of shown) {
      const jid = `${bot.id}@s.whatsapp.net`;
      mentions.push(jid);
      const label = bot.isMain ? "Owner" : "Sub";
      lines[label].push(`- [${label} *${botconf.displayName(bot.id, bot.getSock())}*] › @${bot.id}`);
    }

    let text = `ꕥ Números de Sockets activos *(${online.length})*\n\n`;
    text += `ੈ❖‧₊˚ Principales › *${mains.length}*\n`;
    text += `ੈ✿‧₊˚ Subs › *${subs.length}*\n\n`;
    text += isAll ? `➭ *Lista completa ›* ${shown.length}\n` : `➭ *Bots en el grupo ›* ${shown.length}\n`;
    for (const label of ["Owner", "Sub"]) {
      if (lines[label].length) text += lines[label].join("\n") + "\n";
    }

    return await kit.reply(sock, msg, text.trimEnd(), { mentions });
  } catch (error) {
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, error));
  }
};

handler.command = ["bots", "sockets"];
handler.description = "Ver los bots activos.";
handler.category = "Sub-Bot";
module.exports = handler;
