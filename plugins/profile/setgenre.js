"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

const GENRES = ["Hombre", "Mujer", "Femboy", "Transgénero", "Gay", "Lesbiana", "No Binario", "Pansexual", "Bisexual", "Asexual", "Therian"];

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "setgenre";
  const input = (ctx.args || []).join(" ").trim().toLowerCase();

  if (!input) {
    return kit.reply(sock, msg, `《✧》 Debes ingresar un género válido.\n✎ Ejemplos:\n> *${usedPrefix + command} hombre*\n> *${usedPrefix + command} mujer*`);
  }

  let genre = null;
  if (/^\d+$/.test(input)) {
    const index = parseInt(input) - 1;
    if (index >= 0 && index < GENRES.length) genre = GENRES[index];
  } else {
    genre = GENRES.find((g) => g.toLowerCase() === input) || null;
  }

  if (!genre) {
    const options = GENRES.map((g, i) => `${i + 1}. ${g}`).join("\n");
    return kit.reply(sock, msg, `《✧》 Elije un género válido.\n\nOpciones:\n${options}`);
  }

  pdb.set(pdb.selfJid(msg), "genre", genre);
  return kit.reply(sock, msg, `✎ Se ha establecido tu género como: *${genre}*`);
};

handler.command = ["setgenre"];
handler.description = "Establecer tu género.";
handler.category = "Perfil";
module.exports = handler;
