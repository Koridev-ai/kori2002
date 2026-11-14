"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "setdesc";
  const input = (ctx.args || []).join(" ").trim();

  if (!input) {
    return kit.reply(sock, msg, `《✧》 Debes especificar una descripción válida para tu perfil.\n\n> ✐ Ejemplo » *${usedPrefix + command} Hola, uso WhatsApp!*`);
  }

  pdb.set(pdb.selfJid(msg), "description", input);
  return kit.reply(sock, msg, `✎ Se ha establecido tu descripcion, puedes revisarla con ${usedPrefix}profile ฅ^•ﻌ•^ฅ`);
};

handler.command = ["setdescription", "setdesc"];
handler.description = "Establecer tu descripción de perfil.";
handler.category = "Perfil";
module.exports = handler;
