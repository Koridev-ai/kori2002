"use strict";

const handler = async (msg, _ctx = {}) => {
  const sock = _ctx.conn;
  const text = _ctx.text;
  const args = _ctx.args;
  const sender = _ctx.sender;
  const command = _ctx.command;
  const usedPrefix = _ctx.usedPrefix;
  const { isOwner } = global.__cortana || {};

  {

  const fs = require("fs");
  const path = require("path");

  if (!isOwner) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: "⛔ Este comando es solo para el *Owner*."
    }, { quoted: msg });
    return;
  }

  const buscar = args[0];
  if (!buscar) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: "📍 Especifica el comando que deseas buscar.\n\nEjemplo: *.linia play*"
    }, { quoted: msg });
    return;
  }

  const archivoMain = path.join(global.__cortana.rootDir, "main.js");

  if (!fs.existsSync(archivoMain)) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: "❌ No se encontró el archivo *main.js*."
    }, { quoted: msg });
    return;
  }

  const contenido = fs.readFileSync(archivoMain, "utf-8");
  const lineas = contenido.split("\n");
  let lineaEncontrada = -1;

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    const regex = new RegExp(`^case ['"\`]${buscar}['"\`]:`);
    if (regex.test(linea)) {
      lineaEncontrada = i + 1; // porque queremos número de línea 1-based
      return;
    }
  }

  if (lineaEncontrada !== -1) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: `✅ El comando *${buscar}* fue encontrado en la línea *${lineaEncontrada}* de *main.js*.`
    }, { quoted: msg });
  } else {
    await sock.sendMessage(msg.key.remoteJid, {
      text: `❌ El comando *${buscar}* no se encontró en *main.js*.`
    }, { quoted: msg });
  }

  return;

  }
};

handler.command = ['linia'];
module.exports = handler;
