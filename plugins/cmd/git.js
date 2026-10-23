"use strict";

const fs = require('fs');
const { exec } = require('child_process');

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
        // Verificar que el comando solo lo use el owner
        if (!isOwner(sender)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "⚠️ *Solo el propietario puede usar este comando.*"
            }, { quoted: msg });
            return;
        }

        // Verificar si se proporcionó un comando
        if (!args[0]) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "⚠️ *Debes especificar el nombre de un comando.*\nEjemplo: `.git rest`"
            }, { quoted: msg });
            return;
        }

        // Leer el archivo main.js
        const mainFilePath = "./main.js";
        if (!fs.existsSync(mainFilePath)) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: "❌ *Error:* No se encontró el archivo de comandos."
            }, { quoted: msg });
            return;
        }

        // Leer el contenido del archivo main.js
        const mainFileContent = fs.readFileSync(mainFilePath, "utf-8");

        // Buscar el comando solicitado
        const commandName = args[0].toLowerCase();
        const commandRegex = new RegExp(`case\\s+['"]${commandName}['"]:\\s*([\\s\\S]*?)\\s*return;`, "g");
        const match = commandRegex.exec(mainFileContent);

        if (!match) {
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ *Error:* No se encontró el comando *${commandName}* en el archivo main.js.`
            }, { quoted: msg });
            return;
        }

        // Extraer el código del comando
        const commandCode = `📜 *Código del comando ${commandName}:*\n\n\`\`\`${match[0]}\`\`\``;

        // Enviar el código como mensaje
        await sock.sendMessage(msg.key.remoteJid, {
            text: commandCode
        }, { quoted: msg });

    } catch (error) {
        console.error("❌ Error en el comando git:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ *Error al obtener el código del comando.*"
        }, { quoted: msg });
    }
    return;

  }
};

handler.command = ['git'];
module.exports = handler;
