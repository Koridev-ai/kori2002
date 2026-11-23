"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const db = require("../../libs/groupdb");
const pdb = require("../../libs/profiledb");

module.exports = gk.define({
  commands: ["warn"],
  description: "Darle una advertencia a un miembro del grupo.",
  admin: true,
  run: async ({ sock, msg, g, args }) => {
    const t = gk.target(msg, g);
    if (!t) return kit.reply(sock, msg, "《✧》 Debes mencionar o responder al usuario que deseas advertir.");
    const hasMention = (pdb.mentionTarget(msg)?.raw || "") && kit.getMentions(msg).length > 0;
    const reason = (hasMention ? args.slice(1) : args).join(" ") || "Sin razón.";
    const user = db.user(g.chatId, t.id);
    const author = pdb.selfJid(msg);
    user.warnings.unshift({ reason, timestamp: gk.nowText(), by: author });
    db.save();
    const total = user.warnings.length;
    const list = user.warnings.map((w, i) => `\`#${total - i}\` » ${w.reason}\n> » Fecha: ${w.timestamp}`).join("\n");
    let text = `✐ Se ha añadido una advertencia a @${t.number}.\n✿ Advertencias totales \`(${total})\`:\n\n${list}`;
    const chat = db.chat(g.chatId);
    if (total >= chat.warnLimit && chat.expulsar) {
      if (g.isBotAdmin && t.p && !gk.isProtected(t.p, g, { admins: true })) {
        try {
          await sock.groupParticipantsUpdate(g.chatId, [t.p.id], "remove");
          user.warnings = [];
          db.save();
          text += "\n\n> ❖ El usuario ha alcanzado el límite de advertencias y fue expulsado del grupo.";
        } catch {
          text += "\n\n> ❖ El usuario alcanzó el límite, pero no se pudo expulsar automáticamente.";
        }
      } else {
        text += "\n\n> ❖ El usuario alcanzó el límite, pero no se pudo expulsar automáticamente.";
      }
    } else if (total >= chat.warnLimit) {
      text += "\n\n> ❖ El usuario ha alcanzado el límite de advertencias.";
    }
    return kit.reply(sock, msg, text, { mentions: [t.jid] });
  }
});
