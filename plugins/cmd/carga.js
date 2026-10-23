"use strict";

const { execFile } = require('child_process');

const handler = async (msg, _ctx = {}) => {
  const sock = _ctx.conn;
  const text = _ctx.text;
  const args = _ctx.args;
  const sender = _ctx.sender;
  const command = _ctx.command;
  const usedPrefix = _ctx.usedPrefix;
  const { isOwner } = global.__cortana || {};

  {

  if (!isOwner) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: "⛔ Este comando es solo para el Owner."
    }, { quoted: msg });
    return;
  }

  const fs = require('fs');
  const { execFile } = require('child_process');
  const lastRestarterFile = "./src/lastRestarter.json";

  // Verificar si existe el archivo; si no, crearlo.
  if (!fs.existsSync(lastRestarterFile)) {
    fs.writeFileSync(lastRestarterFile, JSON.stringify({ chatId: "" }, null, 2));
  }

  execFile('git', ['pull'], (error, stdout, stderr) => {
    if (error) {
      sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Error al actualizar: ${error.message}`
      }, { quoted: msg });
      return;
    }
    const output = stdout || stderr;
    if (output.includes("Already up to date")) {
      sock.sendMessage(msg.key.remoteJid, {
        text: `✅ Actualización completada: Ya está al día.`
      }, { quoted: msg });
    } else {
      const message = `✅ Actualización completada:\n\n${output}\n\n🔄 Reiniciando el servidor...`;
      
      // Enviar reacción de reinicio
      sock.sendMessage(msg.key.remoteJid, {
        react: { text: "🔄", key: msg.key }
      });
      
      // Enviar mensaje de notificación
      sock.sendMessage(msg.key.remoteJid, {
        text: message
      }, { quoted: msg });
      
      // Guardar el chat del último restarter
      fs.writeFileSync(lastRestarterFile, JSON.stringify({ chatId: msg.key.remoteJid }, null, 2));
      
      // Reiniciar el bot (asegúrate de usar un gestor de procesos que lo reactive)
      setTimeout(() => {
        process.exit(1);
      }, 3000);
    }
  });
  return;

  }
};

handler.command = ['carga'];
module.exports = handler;
