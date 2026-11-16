"use strict";

const subbot = require("../../libs/subbot");
const sockkit = require("../../libs/sockkit");

module.exports = sockkit.define({
  commands: ["logout"],
  description: "Cerrar la sesión del Sub-Bot.",
  subOnly: true,
  run: async ({ sock, msg, botId, usedPrefix, reply }) => {
    const chatId = msg.key.remoteJid;
    await reply("《✧》 Cerrando sesión del Socket...");
    try {
      await sock.logout();
    } catch {}
    await subbot.stopSub(botId, { remove: true });
    const fallback = global.mainSock;
    if (fallback?.user && fallback !== sock) {
      await fallback.sendMessage(chatId, { text: `《✧》 Sesión finalizada correctamente.\nPuedes reconectarte usando *${usedPrefix}code*` }).catch(() => null);
    }
  }
});
