"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const jid = pdb.selfJid(msg);
  const user = pdb.get(jid);

  if (!user.marry) {
    const word = user.genre === "Mujer" ? "casada" : user.genre === "Hombre" ? "casado" : "casadx";
    return kit.reply(sock, msg, `《✧》 Tú no estás ${word} con nadie.`);
  }

  const partnerId = user.marry;
  const partner = pdb.peek(partnerId);

  pdb.set(jid, "marry", "");
  if (partner) pdb.set(partnerId, "marry", "");

  return kit.reply(sock, msg, `✎ *${user.name}* te has divorciado de *${partner?.name || partnerId}*.`);
};

handler.command = ["divorce"];
handler.description = "Divorciarte de tu pareja.";
handler.category = "Perfil";
module.exports = handler;
