"use strict";

const handler = async (msg, _ctx = {}) => {
  const sock = _ctx.conn;
  const text = _ctx.text;
  const args = _ctx.args;
  const sender = _ctx.sender;
  const command = _ctx.command;
  const usedPrefix = _ctx.usedPrefix;


  {

    try {
        let userJid = null;

        // Enviar reacción antes de procesar el comando
        await sock.sendMessage(msg.key.remoteJid, {
            react: {
                text: "📸", // Emoji de cámara o cualquier otro que prefieras
                key: msg.key
            }
        });

        // Si no hay menciones, no hay participante y no hay texto, mostrar la guía de uso
        const hasMention = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0;
        const hasParticipant = msg.message.extendedTextMessage?.contextInfo?.participant;
        const cleanText = (text || "").trim();

        if (!hasMention && !hasParticipant && !cleanText) {
            return await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: `🔍 *¿Cómo usar el comando .perfil?*\n\n` +
                          `📌 *Ejemplos de uso:*\n\n` +
                          `🔹 *Para obtener la foto de perfil de alguien:* \n` +
                          `   - *Responde a su mensaje con:* _.perfil_\n\n` +
                          `🔹 *Para obtener la foto de perfil de un número:* \n` +
                          `   - _.perfil +1 555-123-4567_\n\n` +
                          `🔹 *Para obtener la foto de perfil de un usuario mencionado:* \n` +
                          `   - _.perfil @usuario_\n\n` +
                          `⚠️ *Nota:* Algunos usuarios pueden tener su foto de perfil privada y el bot no podrá acceder a ella.`
                },
                { quoted: msg }
            );
        }

        // Verifica si se mencionó un usuario
        if (hasMention) {
            userJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } 
        // Verifica si se respondió a un mensaje
        else if (hasParticipant) {
            userJid = msg.message.extendedTextMessage.contextInfo.participant;
        } 
        // Verifica si se ingresó un número en 'text'
        else if (cleanText) {
            let number = cleanText.replace(/[^0-9]/g, ""); // Limpia el número de caracteres no numéricos
            userJid = number + "@s.whatsapp.net";
        }

        // Si no se encontró un usuario válido, termina
        if (!userJid) return;

        // Intentar obtener la imagen de perfil
        let ppUrl;
        try {
            ppUrl = await sock.profilePictureUrl(userJid, "image");
        } catch {
            ppUrl = "https://i.imgur.com/3J8M0wG.png"; // Imagen de perfil por defecto
        }

        // Enviar la imagen de perfil solo si se encontró un userJid
        await sock.sendMessage(
            msg.key.remoteJid,
            {
                image: { url: ppUrl },
                caption: `🖼️ *Foto de perfil de:* @${userJid.split("@")[0]}`,
                mentions: [userJid]
            },
            { quoted: msg }
        );

    } catch (error) {
        console.error("❌ Error en el comando perfil:", error);
        await sock.sendMessage(
            msg.key.remoteJid,
            { text: "❌ *Error:* No se pudo obtener la foto de perfil." },
            { quoted: msg }
        );
    }
    return;

  }
};

handler.command = ['perfil'];
module.exports = handler;
