"use strict";

const os = require("os");
const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");
const main = require("../../libs/mainkit");

function uptimeText(seconds) {
  const s = Number(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return [
    d > 0 ? `${d} ${d === 1 ? "día" : "días"}` : "",
    h > 0 ? `${h} ${h === 1 ? "hora" : "horas"}` : "",
    m > 0 ? `${m} ${m === 1 ? "minuto" : "minutos"}` : "",
    sec > 0 ? `${sec} ${sec === 1 ? "segundo" : "segundos"}` : ""
  ]
    .filter(Boolean)
    .join(", ");
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "infobot";

  try {
    const botName = sock.user?.name || "Bot";
    const ownerId = String((global.owner || [])[0]?.[0] || "").replace(/[^0-9]/g, "");
    const ownerGenre = ownerId ? pdb.peek(ownerId)?.genre : "";
    const ownerLabel = ownerGenre === "Hombre" ? "Dueño" : ownerGenre === "Mujer" ? "Dueña" : "Dueño(a)";
    const ownerJid = ownerId ? `${ownerId}@s.whatsapp.net` : null;

    const startedAt = new Date(Date.now() - process.uptime() * 1000);
    const startedText = startedAt
      .toLocaleString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
      .replace(/^./, (c) => c.toUpperCase());

    const memory = main.memoryStats();
    const ram = `${main.formatBytes(memory.used)} / ${main.formatBytes(memory.limit)} (${memory.percent.toFixed(2)}%)`;

    const text = `✐ Información del bot *${botName}!*

✿ *Nombre ›* ${botName}
✦ *Prefijo ›* \`${usedPrefix}\`

❒ *Plataforma ›* ${os.type()}
❒ *NodeJS ›* ${process.version}
❒ *RAM Utilizada ›* ${ram}
❒ *Activo desde ›* ${startedText}
❒ *Sistema Activo ›* ${uptimeText(os.uptime())}
❒ *${ownerLabel} ›* ${ownerJid ? `@${ownerId}` : "Oculto por privacidad"}`;

    return main.sendWithBanner(sock, msg, text, ownerJid ? [ownerJid] : []);
  } catch (e) {
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["infobot", "botinfo"];
handler.description = "Obtener información del bot.";
handler.category = "General";
module.exports = handler;
