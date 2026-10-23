"use strict";

const { exec } = require('child_process');

const handler = async (msg, _ctx = {}) => {
  const sock = _ctx.conn;
  const text = _ctx.text;
  const args = _ctx.args;
  const sender = _ctx.sender;
  const command = _ctx.command;
  const usedPrefix = _ctx.usedPrefix;


  {

    const cp = require('child_process');
    const { promisify } = require('util');
    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');
    
    const exec = promisify(cp.execFile).bind(cp);

    // Enviar una reacción antes de procesar el comando ⏳
    await sock.sendMessage(msg.key.remoteJid, { 
        react: { text: "⏳", key: msg.key } 
    });

    await sock.sendMessage(msg.key.remoteJid, {
        text: '🚀 Prueba de velocidad en curso... ⏳',
        mentions: [msg.key.participant || msg.key.remoteJid],
    }, { quoted: msg });

    let o;
    try {
        o = await exec('python3', ['speed.py', '--secure', '--share']);
    } catch (e) {
        o = e;
    } finally {
        const { stdout = '', stderr = '' } = o || {};
        
        if (stdout.trim()) {
            let result = stdout.trim();
            let imageUrlMatch = result.match(/(https?:\/\/[^\s]+)/); // Buscar la URL de la imagen de Speedtest
            
            if (imageUrlMatch) {
                let imageUrl = imageUrlMatch[0];

                try {
                    // Descargar la imagen de Speedtest
                    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                    const imageBuffer = Buffer.from(response.data);
                    const imagePath = path.join(global.__cortana.rootDir, 'tmp', 'speedtest.png');

                    fs.writeFileSync(imagePath, imageBuffer); // Guardar la imagen temporalmente

                    // Enviar imagen con los resultados
                    await sock.sendMessage(msg.key.remoteJid, { 
                        image: { url: imagePath },
                        caption: `📊 *Resultados de Speedtest:*\n\n${result.replace(imageUrl, '').trim()}`
                    }, { quoted: msg });

                    fs.unlinkSync(imagePath); // Eliminar la imagen después de enviarla
                } catch (error) {
                    console.error('Error al descargar la imagen:', error);
                    await sock.sendMessage(msg.key.remoteJid, { 
                        text: `⚠️ No se pudo descargar la imagen de Speedtest, pero aquí están los resultados:\n\n${result}`
                    }, { quoted: msg });
                }
            } else {
                // Si no hay URL de imagen, solo enviar el texto del resultado
                await sock.sendMessage(msg.key.remoteJid, { text: result }, { quoted: msg });
            }
        }
        
        if (stderr.trim()) {
            await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Error en Speedtest:\n\n${stderr}` }, { quoted: msg });
            console.log(stderr);
        }

        // Enviar una reacción de confirmación ✅ después de completar la prueba
        await sock.sendMessage(msg.key.remoteJid, { 
            react: { text: "✅", key: msg.key } 
        });
    }
    return;

  }
};

handler.command = ['speed'];
module.exports = handler;
