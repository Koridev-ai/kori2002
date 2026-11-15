"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const db = require("../../libs/groupdb");
const pdb = require("../../libs/profiledb");

module.exports = gk.define({
  commands: ["topinactive", "topinactivos", "topinactiveusers"],
  description: "Ver el top de usuarios más inactivos del grupo.",
  run: async ({ sock, msg, g, args, usedPrefix, command }) => {
    let days = args[0] ? parseInt(args[0], 10) : 30;
    if (isNaN(days) || days < 1) days = 30;
    const stored = db.chat(g.chatId).users;
    const rows = g.participants
      .filter((p) => !(g.bot && p.id === g.bot.id))
      .map((p) => ({ jid: p.id, msgs: db.periodStats(stored[db.key(p.id)] || stored[db.key(p.phoneNumber)], days).msgs }))
      .sort((a, b) => a.msgs - b.msgs);
    if (!rows.length) return kit.reply(sock, msg, `「✎」 No hay actividad registrada en los últimos ${days} días.`);
    const perPage = 10;
    const totalPages = Math.ceil(rows.length / perPage);
    const page = parseInt(args[1], 10) || 1;
    if (page < 1 || page > totalPages) return kit.reply(sock, msg, `「✎」 Página inválida. Solo hay ${totalPages} páginas disponibles.`);
    const start = (page - 1) * perPage;
    let report = `❀ Top de usuarios inactivos ❀\n> » Días: \`${days}\`\n> » Página: \`${page}\` de \`${totalPages}\`\n> » Registrando desde hace: \`${Math.floor(db.trackedDays(g.chatId))}\` días\n\n`;
    const mentions = [];
    rows.slice(start, start + perPage).forEach((u, i) => {
      report += `*${start + i + 1}.* ${pdb.peek(u.jid)?.name || gk.mention(u.jid)}\n   » Mensajes: \`${u.msgs}\`\n`;
      mentions.push(u.jid);
    });
    if (page < totalPages) report += `\n> Para ver la siguiente página › *${usedPrefix + command} ${days} ${page + 1}*`;
    return kit.reply(sock, msg, report, { mentions });
  }
});
