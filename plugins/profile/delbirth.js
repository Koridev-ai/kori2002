"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const jid = pdb.selfJid(msg);
  const user = pdb.get(jid);

  if (!user.birth) return kit.reply(sock, msg, "《✧》 No tienes una fecha de nacimiento establecida.");

  pdb.set(jid, "birth", "");
  return kit.reply(sock, msg, "✎ Tu fecha de nacimiento ha sido eliminada.");
};

handler.command = ["delbirth"];
handler.description = "Borrar tu fecha de cumpleaños.";
handler.category = "Perfil";
module.exports = handler;
