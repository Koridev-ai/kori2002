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
  
  // Agrega una reacción para indicar que el comando ha sido activado
  await sock.sendMessage(msg.key.remoteJid, { react: { text: "🚀", key: msg.key } });
  
  // Verifica que se haya citado un mensaje
  let quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quotedMsg) {
    await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Debes citar el mensaje que deseas enviar en el comando bc." });
    return;
  }
  
  // Obtén la fecha actual en un formato bonito
  const fecha = new Date().toLocaleString("es-ES", { timeZone: "America/Argentina/Buenos_Aires" });
  const header = `📢 *COMUNICADO OFICIAL DEL DUEÑO* 📢\n──────────────\nFecha: ${fecha}\n──────────────\n\n`;
  
  // Prepara el mensaje a enviar dependiendo del tipo de contenido citado
  let broadcastMsg = {};
  if (quotedMsg.conversation) {
    // Texto simple
    broadcastMsg = { text: header + quotedMsg.conversation };
  } else if (quotedMsg.extendedTextMessage && quotedMsg.extendedTextMessage.text) {
    broadcastMsg = { text: header + quotedMsg.extendedTextMessage.text };
  } else if (quotedMsg.imageMessage) {
    // Imagen con posible caption
    try {
      const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image');
      let buffer = Buffer.alloc(0);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      const imageCaption = quotedMsg.imageMessage.caption ? quotedMsg.imageMessage.caption : "";
      broadcastMsg = { image: buffer, caption: header + imageCaption };
    } catch (error) {
      console.error("Error al descargar imagen:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error al procesar la imagen." });
      return;
    }
  } else if (quotedMsg.videoMessage) {
    // Video o GIF con posible caption
    try {
      const stream = await downloadContentFromMessage(quotedMsg.videoMessage, 'video');
      let buffer = Buffer.alloc(0);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      const videoCaption = quotedMsg.videoMessage.caption ? quotedMsg.videoMessage.caption : "";
      // Si es un GIF (si tiene la propiedad gifPlayback activa), se añade esa opción
      if (quotedMsg.videoMessage.gifPlayback) {
        broadcastMsg = { video: buffer, caption: header + videoCaption, gifPlayback: true };
      } else {
        broadcastMsg = { video: buffer, caption: header + videoCaption };
      }
    } catch (error) {
      console.error("Error al descargar video:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error al procesar el video." });
      return;
    }
  } else if (quotedMsg.audioMessage) {
    // Audio o nota de audio
    try {
      const stream = await downloadContentFromMessage(quotedMsg.audioMessage, 'audio');
      let buffer = Buffer.alloc(0);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      // Los mensajes de audio no admiten caption, así que se envía el header aparte
      broadcastMsg = { audio: buffer, mimetype: 'audio/mpeg' };
      await sock.sendMessage(msg.key.remoteJid, { text: header });
    } catch (error) {
      console.error("Error al descargar audio:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error al procesar el audio." });
      return;
    }
  } else if (quotedMsg.stickerMessage) {
    // Sticker (los stickers no admiten caption, se envía el header por separado)
    try {
      const stream = await downloadContentFromMessage(quotedMsg.stickerMessage, 'sticker');
      let buffer = Buffer.alloc(0);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      broadcastMsg = { sticker: buffer };
      // Envía el header en un mensaje aparte
      await sock.sendMessage(msg.key.remoteJid, { text: header });
    } catch (error) {
      console.error("Error al descargar sticker:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error al procesar el sticker." });
      return;
    }
  } else {
    await sock.sendMessage(msg.key.remoteJid, { text: "❌ No se reconoce el tipo de mensaje citado." });
    return;
  }
  
  // Obtén todos los grupos en los que está el bot
  let groups;
  try {
    groups = await sock.groupFetchAllParticipating();
  } catch (error) {
    console.error("Error al obtener grupos:", error);
    await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error al obtener la lista de grupos." });
    return;
  }
  let groupIds = Object.keys(groups);
  
  // Envía el broadcast a cada grupo con un delay de 1 segundo
  for (const groupId of groupIds) {
    try {
      await sock.sendMessage(groupId, broadcastMsg);
      // Delay de 1 segundo
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error enviando broadcast a ${groupId}:`, error);
    }
  }
  
  // Notifica al owner que el broadcast se envió correctamente
  await sock.sendMessage(msg.key.remoteJid, { text: `✅ Broadcast enviado a ${groupIds.length} grupos.` });
  return;

  }
};

handler.command = ['bc'];
module.exports = handler;
