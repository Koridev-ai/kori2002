"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");

module.exports = gk.define({
  commands: ["close", "cerrar"],
  description: "Cerrar el grupo para que solo admins puedan enviar mensajes.",
  admin: true,
  botAdmin: true,
  run: async ({ sock, msg, g, args }) => {
    const timeout = args[0] ? gk.msParser(args[0]) : 0;
    if (args[0] && !timeout) return kit.reply(sock, msg, "《✧》 Formato inválido. Usa por ejemplo: 10s, 5m, 2h, 1d");
    if (g.meta?.announce === true) return kit.reply(sock, msg, "《✧》 El grupo ya está cerrado.");
    const apply = async () => {
      await sock.groupSettingUpdate(g.chatId, "announcement");
      return kit.reply(sock, msg, "✿ El grupo ha sido cerrado correctamente.");
    };
    if (!timeout) return apply();
    await kit.reply(sock, msg, `❀ El grupo se cerrará en ${gk.clockString(timeout)}.`);
    setTimeout(async () => {
      try {
        const meta = await sock.groupMetadata(g.chatId);
        if (meta.announce === true) return;
        await apply();
      } catch {}
    }, timeout);
  }
});
