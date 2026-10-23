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
        
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) {
            return sock.sendMessage(
                msg.key.remoteJid,
                { text: "❌ *Error:* Debes responder a una imagen, video o nota de voz para reenviarla." },
                { quoted: msg }
            );
        }

       
        const unwrap = m => {
            let node = m;
            while (
                node?.viewOnceMessage?.message          ||
                node?.viewOnceMessageV2?.message        ||
                node?.viewOnceMessageV2Extension?.message ||
                node?.ephemeralMessage?.message
            ) {
                node =
                    node.viewOnceMessage?.message            ||
                    node.viewOnceMessageV2?.message          ||
                    node.viewOnceMessageV2Extension?.message ||
                    node.ephemeralMessage?.message           ||
                    node;
            }
            return node;
        };
        const inner = unwrap(quoted);

        
        let mediaType, mediaMsg;
        if (inner.imageMessage) {
            mediaType = "image"; mediaMsg = inner.imageMessage;
        } else if (inner.videoMessage) {
            mediaType = "video"; mediaMsg = inner.videoMessage;
        } else if (inner.audioMessage || inner.voiceMessage || inner.pttMessage) {
            
            mediaType = "audio";
            mediaMsg  = inner.audioMessage || inner.voiceMessage || inner.pttMessage;
        } else {
            return sock.sendMessage(
                msg.key.remoteJid,
                { text: "❌ *Error:* El mensaje citado no contiene un archivo compatible." },
                { quoted: msg }
            );
        }

        
        await sock.sendMessage(msg.key.remoteJid, {
            react: { text: "⏳", key: msg.key }
        });

        
        const mediaBuffer = await (async () => {
            try {
                const stream = await downloadContentFromMessage(mediaMsg, mediaType);
                let buf = Buffer.alloc(0);
                for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
                return buf;
            } catch { return null; }
        })();

        if (!mediaBuffer?.length) {
            return sock.sendMessage(
                msg.key.remoteJid,
                { text: "❌ *Error:* No se pudo descargar el archivo. Intenta de nuevo." },
                { quoted: msg }
            );
        }

        
        const credit  = "> 🔓 Recuperado por:\n\`Azura Ultra`";
        const opts    = { mimetype: mediaMsg.mimetype };

        if (mediaType === "image") {
            opts.image   = mediaBuffer;
            opts.caption = credit;                
        } else if (mediaType === "video") {
            opts.video   = mediaBuffer;
            opts.caption = credit;               
        } else { 
            opts.audio   = mediaBuffer;
            opts.ptt     = mediaMsg.ptt ?? true;  
            if (mediaMsg.seconds) opts.seconds = mediaMsg.seconds; 
        }

        await sock.sendMessage(msg.key.remoteJid, opts, { quoted: msg });

        
        if (mediaType === "audio") {
            await sock.sendMessage(
                msg.key.remoteJid,
                { text: credit },
                { quoted: msg }
            );
        }

        
        await sock.sendMessage(msg.key.remoteJid, {
            react: { text: "✅", key: msg.key }
        });

    } catch (err) {
        console.error("❌ Error en comando ver:", err);
        await sock.sendMessage(
            msg.key.remoteJid,
            { text: "❌ *Error:* Hubo un problema al procesar el archivo." },
            { quoted: msg }
        );
    }
    return;

  }
};

handler.command = ['ver'];
module.exports = handler;
