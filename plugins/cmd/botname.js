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

  // Verifica que el usuario sea owner
  if (!global.isOwner(sender)) {
    await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Solo el owner puede usar este comando." });
    return;
  }
  // Envía una reacción para indicar que se activó el comando
  await sock.sendMessage(msg.key.remoteJid, { react: { text: "✏️", key: msg.key } });
  
  // Verifica que se haya proporcionado un nuevo nombre en los argumentos
  let newName = args.join(" ").trim();
  if (!newName) {
    await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Debes proporcionar un nuevo nombre para el bot." });
    return;
  }
  
  try {
    // Actualiza el nombre del bot (asumiendo que sock.updateProfileName existe)
    await sock.updateProfileName(newName);
    await sock.sendMessage(msg.key.remoteJid, { text: `✅ Nombre del bot actualizado a: ${newName}` });
    // Reacción final de éxito
    await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });
  } catch (error) {
    console.error("Error en botname:", error);
    await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error al actualizar el nombre del bot." });
  }
  return;

  }
};

handler.command = ['botname'];
module.exports = handler;
