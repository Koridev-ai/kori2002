"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");

module.exports = gk.define({
  commands: ["open", "abrir"],
  description: "Abrir el grupo para que todos puedan enviar mensajes.",
  admin: true,
  botAdmin: true,
  run: async ({ sock, msg, g, args }) => {
    const timeout = args[0] ? gk.msParser(args[0]) : 0;
    if (args[0] && !timeout) return kit.reply(sock, msg, "《✧》 Formato inválido. Usa por ejemplo: 10s, 5m, 2h, 1d");
    if (g.meta?.announce === false) return kit.reply(sock, msg, "《✧》 El grupo ya está abierto.");
    const apply = async () => {
      await sock.groupSettingUpdate(g.chatId, "not_announcement");
      return kit.reply(sock, msg, "✿ El grupo ha sido abierto correctamente.");
    };
    if (!timeout) return apply();
    await kit.reply(sock, msg, `❀ El grupo se abrirá en ${gk.clockString(timeout)}.`);
    setTimeout(async () => {
      try {
        const meta = await sock.groupMetadata(g.chatId);
        if (meta.announce === false) return;
        await apply();
      } catch {}
    }, timeout);
  }
});
