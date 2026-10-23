"use strict";

const fs = require('fs');

const handler = async (msg, _ctx = {}) => {
  const sock = _ctx.conn;
  const text = _ctx.text;
  const args = _ctx.args;
  const sender = _ctx.sender;
  const command = _ctx.command;
  const usedPrefix = _ctx.usedPrefix;
  const { isOwner, configFilePath } = global.__cortana || {};

  {

    try {
        // Obtener el número del bot
        const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";

        // Verificar si el remitente es un dueño autorizado o el mismo bot
        const isBotMessage = msg.key.fromMe || sender === botNumber;

        if (!isOwner(sender) && !isBotMessage) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: "⛔ *Solo los dueños del bot o el bot mismo pueden cambiar el prefijo.*" 
            }, { quoted: msg });
            return;
        }

        // Verificar si el usuario proporcionó un nuevo prefijo
        if (!args[0]) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: "⚠️ *Debes especificar un nuevo prefijo.*\nEjemplo: `.setprefix !`" 
            }, { quoted: msg });
            return;
        }

        const newPrefix = args[0];

        // Verificar si el nuevo prefijo está permitido
        if (!allowedPrefixes.includes(newPrefix)) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: "❌ *Prefijo inválido.* Usa un solo carácter o emoji permitido." 
            }, { quoted: msg });
            return;
        }

        // Guardar el nuevo prefijo en `config.json`
        fs.writeFileSync(configFilePath, JSON.stringify({ prefix: newPrefix }, null, 2));

        // Actualizar `global.prefix`
        global.prefix = newPrefix;

        // Confirmación del cambio
        await sock.sendMessage(msg.key.remoteJid, { 
            text: `✅ *Prefijo cambiado a:* *${newPrefix}*` 
        }, { quoted: msg });

        console.log(`🔄 Prefijo cambiado a: ${newPrefix}`);

    } catch (error) {
        console.error("❌ Error en el comando .setprefix:", error);
        await sock.sendMessage(msg.key.remoteJid, { 
            text: "❌ *Error al cambiar el prefijo.*" 
        }, { quoted: msg });
    }
    return;
             
        
        

  }
};

handler.command = ['setprefix'];
module.exports = handler;
