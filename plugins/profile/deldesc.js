"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const jid = pdb.selfJid(msg);
  const user = pdb.get(jid);

  if (!user.description) return kit.reply(sock, msg, "《✧》 No tienes una descripción establecida.");

  pdb.set(jid, "description", "");
  return kit.reply(sock, msg, "✎ Tu descripción ha sido eliminada.");
};

handler.command = ["deldescription", "deldesc"];
handler.description = "Eliminar tu descripción de perfil.";
handler.category = "Perfil";
module.exports = handler;
