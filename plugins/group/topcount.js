"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const db = require("../../libs/groupdb");
const pdb = require("../../libs/profiledb");

module.exports = gk.define({
  commands: ["topcount", "topmensajes", "topmsgcount", "topmessages"],
  description: "Ver el top de usuarios con más mensajes en el grupo.",
  run: async ({ sock, msg, g, args, usedPrefix, command }) => {
    const days = args[0] ? parseInt(args[0], 10) : 1;
    if (isNaN(days) || days < 1) return kit.reply(sock, msg, "「✎」 El número de días debe ser mayor a 0.");
    const users = db.chat(g.chatId).users;
    const ranking = Object.entries(users)
      .map(([id, u]) => ({ id, ...db.periodStats(u, days) }))
      .filter((u) => u.msgs > 0)
      .sort((a, b) => b.msgs - a.msgs);
    if (!ranking.length) return kit.reply(sock, msg, `「✎」 No hay actividad registrada en los últimos ${days} días.`);
    const perPage = 10;
    const totalPages = Math.ceil(ranking.length / perPage);
    const page = parseInt(args[1], 10) || 1;
    if (page < 1 || page > totalPages) return kit.reply(sock, msg, `「✎」 Página inválida. Solo hay ${totalPages} páginas disponibles.`);
    const start = (page - 1) * perPage;
    let report = `❀ Top de mensajes en los últimos *${days}* día${days > 1 ? "s" : ""}\n\n`;
    ranking.slice(start, start + perPage).forEach((u, i) => {
      report += `*${start + i + 1}.* ${pdb.peek(u.id)?.name || u.id}\n   » Mensajes: \`${u.msgs}\`, Comandos: \`${u.cmds}\`\n`;
    });
    if (page < totalPages) report += `\n> Para ver la siguiente página › *${usedPrefix + command} ${days} ${page + 1}*`;
    return kit.reply(sock, msg, report);
  }
});
