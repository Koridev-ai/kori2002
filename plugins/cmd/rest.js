"use strict";

const fs = require('fs');

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
        const senderNumber = (msg.key.participant || sender).replace("@s.whatsapp.net", "");
        const botNumber = sock.user.id.split(":")[0]; // Obtener el número del bot correctamente
        const isBotMessage = msg.key.fromMe; // True si el mensaje es del bot

        if (!isOwner(senderNumber) && !isBotMessage) { 
            await sock.sendMessage(msg.key.remoteJid, { 
                text: "⛔ *Solo los dueños del bot o el bot mismo pueden reiniciar el servidor.*"
            }, { quoted: msg });
            return;
        }

        // 🟢 Enviar reacción antes de reiniciar
        await sock.sendMessage(msg.key.remoteJid, {
            react: { text: "🔄", key: msg.key } // Emoji de reinicio
        });

        // Enviar mensaje de confirmación
        await sock.sendMessage(msg.key.remoteJid, {
            text: "🔄 *Reiniciando el servidor...* \nEspera unos segundos..."
        }, { quoted: msg });

        // Definir la ruta del archivo donde se guardará el último chat que ejecutó .rest
        const lastRestarterFile = "./src/lastRestarter.json";

        // Verificar si el archivo existe, si no, crearlo
        if (!fs.existsSync(lastRestarterFile)) {
            fs.writeFileSync(lastRestarterFile, JSON.stringify({ chatId: "" }, null, 2));
        }

        // Guardar el chat donde se usó el comando para avisar cuando el bot esté en línea
        fs.writeFileSync(lastRestarterFile, JSON.stringify({ chatId: msg.key.remoteJid }, null, 2));

        // Esperar unos segundos antes de reiniciar
        setTimeout(() => {
            process.exit(1); // Reiniciar el bot (depende de tu gestor de procesos)
        }, 3000);

    } catch (error) {
        console.error("❌ Error en el comando rest:", error);
        await sock.sendMessage(msg.key.remoteJid, { 
            text: "❌ *Error al intentar reiniciar el servidor.*"
        }, { quoted: msg });
    }
    return;
        

  }
};

handler.command = ['rest'];
module.exports = handler;
