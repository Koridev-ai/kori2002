"use strict";

const moment = require("moment");
require("moment/locale/es");
const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

const FORMATS = ["DD/MM/YYYY", "DD/MM", "D MMM", "D MMM YYYY"];

function parseBirth(text, currentYear, usedPrefix, command) {
  const date = moment(text, FORMATS, "es", true);
  if (!date.isValid()) return null;
  if (!/\d{4}/.test(text)) date.year(currentYear);
  const year = date.year();
  if (year > currentYear) {
    return { error: `✦ El año no puede ser mayor a ${currentYear}. Ejemplo: ${usedPrefix + command} 01/12/${currentYear}` };
  }
  if (currentYear - year > 120) return { error: "✦ La fecha establecida es invalida." };
  return { value: `${date.format("dddd")}, ${date.date()} de ${date.format("MMMM")} de ${year}` };
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "setbirth";
  const input = (ctx.args || []).join(" ").trim();
  const currentYear = new Date().getFullYear();

  if (!input) {
    return kit.reply(sock, msg, `《✧》 Debes ingresar una fecha válida para tu cumpleaños.\n✐ Ejemplos:\n> ${usedPrefix + command} *01/01/2000* (día/mes/año)\n> ${usedPrefix + command} *01/01* (día/mes/año)`);
  }

  const result = parseBirth(input, currentYear, usedPrefix, command);
  if (!result) return kit.reply(sock, msg, `《✧》 Fecha inválida. Usa › *${usedPrefix + command} 01/01/2000*`);
  if (result.error) return kit.reply(sock, msg, result.error);

  pdb.set(pdb.selfJid(msg), "birth", result.value);
  return kit.reply(sock, msg, `✎ Se ha establecido tu fecha de nacimiento como: *${result.value}*`);
};

handler.command = ["setbirth"];
handler.description = "Establecer tu fecha de cumpleaños.";
handler.category = "Perfil";
module.exports = handler;
