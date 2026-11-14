"use strict";

const FALLBACK_NAME = "Rem";

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const botName = sock.user?.name || FALLBACK_NAME;

  try {
    const start = Date.now();
    const sent = await sock.sendMessage(chatId, { text: `\`❏ ¡Pong!\`\n> *${botName}*` }, { quoted: msg });
    const latency = Date.now() - start;
    const result = `✿ *Pong!*\n> Tiempo ⴵ ${latency}ms`;

    if (sent?.key) {
      try {
        await sock.sendMessage(chatId, { text: result, edit: sent.key });
        return;
      } catch (error) {
        console.error("❌ No se pudo editar el mensaje de ping:", error.message);
      }
    }

    await sock.sendMessage(chatId, { text: result }, { quoted: msg });
  } catch (error) {
    console.error("❌ Error en ping:", error);
    await sock.sendMessage(chatId, { text: "❌ Error calculando el ping." }, { quoted: msg }).catch(() => null);
  }
};

handler.command = ["ping"];
handler.description = "Muestra la latencia del bot";
handler.category = "General";
module.exports = handler;
