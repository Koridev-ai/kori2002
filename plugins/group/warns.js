"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const db = require("../../libs/groupdb");
const pdb = require("../../libs/profiledb");

module.exports = gk.define({
  commands: ["warns"],
  description: "Ver todas las advertencias de un miembro del grupo.",
  admin: true,
  run: async ({ sock, msg, g }) => {
    const t = gk.target(msg, g);
    if (!t) return kit.reply(sock, msg, "《✧》 Menciona o responde a un usuario válido para ver sus advertencias.");
    const warnings = db.user(g.chatId, t.jid).warnings;
    const total = warnings.length;
    if (!total) return kit.reply(sock, msg, `《✧》 @${t.number} no tiene advertencias registradas.`, { mentions: [t.jid] });
    const name = pdb.peek(t.jid)?.name || "Usuario";
    const list = warnings
      .map((w, i) => `\`#${total - i}\` » ${w.reason}\n> » Fecha: ${w.timestamp}${w.by ? `\n> » Por: @${gk.mention(w.by).slice(1)}` : ""}`)
      .join("\n");
    const mentions = [t.jid, ...warnings.map((w) => w.by).filter(Boolean)];
    return kit.reply(sock, msg, `✐ Advertencias de @${t.number} (${name}):\n> ✧ Total de advertencias: \`${total}\`\n\n${list}`, { mentions });
  }
});
