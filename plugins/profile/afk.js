"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const jid = pdb.selfJid(msg);
  const reason = (ctx.args || []).join(" ").trim();
  const user = pdb.get(jid);

  user.afk = Date.now();
  user.afkReason = reason;
  pdb.save();

  return kit.reply(sock, msg, `ꕥ El Usuario *${user.name}* estará AFK.\n> ○ Motivo » *${reason || "Sin Especificar!"}*`);
};

handler.command = ["afk"];
handler.description = "Activar el modo ausente (AFK).";
handler.category = "Perfil";
module.exports = handler;
