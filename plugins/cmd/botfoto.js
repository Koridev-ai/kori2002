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
  await sock.sendMessage(msg.key.remoteJid, { react: { text: "📸", key: msg.key } });
  
  // Verifica que se haya respondido a un mensaje que contenga una imagen
  let quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quotedMsg || !quotedMsg.imageMessage) {
    await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Debes responder a un mensaje que contenga una imagen para actualizar la foto del bot." });
    return;
  }
  
  try {
    // Descarga la imagen del mensaje citado
    const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image');
    let buffer = Buffer.alloc(0);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    // Actualiza la foto del bot usando su ID (sock.user.id)
    await sock.updateProfilePicture(sock.user.id, buffer);
    await sock.sendMessage(msg.key.remoteJid, { text: "✅ Foto del bot actualizada correctamente." });
    // Reacción final de éxito
    await sock.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });
  } catch (error) {
    console.error("Error en botfoto:", error);
    await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error al actualizar la foto del bot." });
  }
  return;

  }
};

handler.command = ['botfoto'];
module.exports = handler;
