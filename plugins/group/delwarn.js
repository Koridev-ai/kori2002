"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const db = require("../../libs/groupdb");
const pdb = require("../../libs/profiledb");

module.exports = gk.define({
  commands: ["delwarn"],
  description: "Eliminar una advertencia de un miembro del grupo.",
  admin: true,
  run: async ({ sock, msg, g, args }) => {
    const t = gk.target(msg, g);
    if (!t) return kit.reply(sock, msg, "《✧》 Debes mencionar o responder al usuario cuya advertencia deseas eliminar.");
    const user = db.user(g.chatId, t.jid);
    const total = user.warnings.length;
    if (!total) return kit.reply(sock, msg, `《✧》 El usuario @${t.number} no tiene advertencias registradas.`, { mentions: [t.jid] });
    const name = pdb.peek(t.jid)?.name || "Usuario";
    const hasMention = kit.getMentions(msg).length > 0;
    const raw = hasMention ? args[1] : args[0];
    if (String(raw || "").toLowerCase() === "all") {
      user.warnings = [];
      db.save();
      return kit.reply(sock, msg, `✐ Se han eliminado todas las advertencias del usuario @${t.number} (${name}).`, { mentions: [t.jid] });
    }
    const index = parseInt(raw, 10);
    if (isNaN(index)) return kit.reply(sock, msg, "《✧》 Debes especificar el índice de la advertencia que deseas eliminar o usar all para borrar todas.");
    if (index < 1 || index > total) return kit.reply(sock, msg, `ꕥ El índice debe ser un número entre 1 y ${total}.`);
    user.warnings.splice(total - index, 1);
    db.save();
    return kit.reply(sock, msg, `ꕥ Se ha eliminado la advertencia #${index} del usuario @${t.number} (${name}).`, { mentions: [t.jid] });
  }
});
