"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const jid = pdb.selfJid(msg);
  const user = pdb.get(jid);

  if (!user.pasatiempo) return kit.reply(sock, msg, "《✧》 No tienes ningún pasatiempo establecido.");

  pdb.set(jid, "pasatiempo", "");
  return kit.reply(sock, msg, "✎ Se ha eliminado tu pasatiempo.");
};

handler.command = ["delpasatiempo", "removehobby"];
handler.description = "Eliminar tu pasatiempo del perfil.";
handler.category = "Perfil";
module.exports = handler;
