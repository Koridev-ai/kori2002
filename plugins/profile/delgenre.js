"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const jid = pdb.selfJid(msg);
  const user = pdb.get(jid);

  if (!user.genre) return kit.reply(sock, msg, "《✧》 No tienes un género asignado.");

  pdb.set(jid, "genre", "");
  return kit.reply(sock, msg, "✎ Tu género ha sido eliminado.");
};

handler.command = ["delgenre"];
handler.description = "Eliminar tu género del perfil.";
handler.category = "Perfil";
module.exports = handler;
