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
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: "ℹ️", key: msg.key }
    });

    const infoMessage = `╭─ *🤖 CORTANA 2.0 BOT* ─╮
│ 🔹 *Prefijo actual:* ${global.prefix}
│ 👑 *Dueño:* Russell xz
│ 🛠️ *Bot desarrollado desde cero* con la ayuda de Chatgpt.
│ 🚀 *Creado por:* Russell
│  
├─〔 📥 *Descargas Redes* 〕─
│ 📌 *IG, TikTok y FB*  
│    - 👤 *Colaboró:* DIEGO-OFC  
│  
│ 📌 *Descargas youtube*
│     (.play, .play2, .ytmp3, .ytmp4)  
│    - 👤 *Colaboró:* Eliasar54  
│  
├─〔 📜 *Menús y Comandos* 〕─
│ 📌 Usa *${global.prefix}menu* para ver los comandos principales.  
│ 📌 Usa *${global.prefix}allmenu* para ver todos los comandos disponibles.  
│ 📌 Usa *${global.prefix}menuaudio* para ver los comandos de multimedia y guardado.  
╰──────────────────╯`;

    await sock.sendMessage2(msg.key.remoteJid,
  {
    image: { url: "https://cdn.russellxz.click/8d278a49.jpeg" }, 
    caption: infoMessage 
  },
  msg 
);
    

  } catch (error) {
    console.error("Error en comando info:", error);
    await sock.sendMessage2(
      msg.key.remoteJid,
      "❌ *Ocurrió un error al mostrar la información. Inténtalo de nuevo.*",
      msg
    );
  }
  return;
        

  }
};

handler.command = ['info'];
module.exports = handler;
