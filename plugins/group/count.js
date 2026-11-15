"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const db = require("../../libs/groupdb");
const pdb = require("../../libs/profiledb");

module.exports = gk.define({
  commands: ["count", "mensajes", "messages", "msgcount"],
  description: "Obtener el conteo de mensajes de un usuario.",
  run: async ({ sock, msg, g, args }) => {
    const t = gk.target(msg, g);
    const jid = t ? t.jid : pdb.selfJid(msg);
    const user = db.peekUser(g.chatId, jid);
    if (!user) return kit.reply(sock, msg, "「✎」 El usuario mencionado no tiene actividad registrada todavía.");
    const days = parseInt(args[0], 10) || 30;
    const stats = db.periodStats(user, days);
    let report = `❀ Contador de mensajes de ${gk.mention(jid)}\n> Total en los últimos *${days}* días: \`${stats.msgs}\` mensajes\n\n`;
    for (const [date, d] of stats.entries) {
      const label = new Date(date).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
      report += `*❏ ${label}*\n\t» Mensajes: \`${d.msgs || 0}\`, Comandos: \`${d.cmds || 0}\`\n`;
    }
    return kit.reply(sock, msg, report, { mentions: [jid] });
  }
});
