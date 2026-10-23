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

  try {
    const senderNumber = (msg.key.participant || msg.key.remoteJid).replace(/[@:\-s.whatsapp.net]/g, "");
    const isBotMessage = msg.key.fromMe;

    if (!isOwner(senderNumber) && !isBotMessage) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Este comando es solo para el *dueño del bot*."
      }, { quoted: msg });
      return;
    }

    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    const args = messageText.trim().split(" ").slice(1);

    if (!["on", "off"].includes(args[0])) {
      await sock.sendMessage(msg.key.remoteJid, {
        text: "✳️ Usa correctamente:\n\n.modoprivado on / off"
      }, { quoted: msg });
      return;
    }

    const fs = require("fs");
    const path = require("path");
    const activosPath = path.join(global.__cortana.rootDir, "src", "activos.json");
    const activos = fs.existsSync(activosPath)
      ? JSON.parse(fs.readFileSync(activosPath))
      : {};

    activos.modoPrivado = args[0] === "on";
    fs.writeFileSync(activosPath, JSON.stringify(activos, null, 2));

    await sock.sendMessage(msg.key.remoteJid, {
      text: `🔐 Modo privado *${args[0] === "on" ? "activado" : "desactivado"}*.`
    }, { quoted: msg });

  } catch (err) {
    console.error("❌ Error en modoprivado:", err);
    await sock.sendMessage(msg.key.remoteJid, {
      text: "❌ Ocurrió un error al activar el modo privado."
    }, { quoted: msg });
  }
  return;

  }
};

handler.command = ['modoprivado'];
module.exports = handler;
