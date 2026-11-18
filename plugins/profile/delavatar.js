"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");
const avatar = require("../../libs/avatardb");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const removed = avatar.remove(pdb.selfJid(msg));
  if (!removed) return kit.reply(sock, msg, "《✧》 No tienes una imagen de perfil personalizada.");
  return kit.reply(sock, msg, "✎ Tu imagen de perfil personalizada fue eliminada.");
};

handler.command = ["delavatar", "delfoto"];
handler.description = "Eliminar tu imagen o gif de perfil.";
handler.category = "Perfil";
module.exports = handler;
