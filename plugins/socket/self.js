"use strict";

const botconf = require("../../libs/botconf");
const sockkit = require("../../libs/sockkit");

module.exports = sockkit.define({
  commands: ["self"],
  description: "Hacer privado o público tu bot.",
  run: async ({ args, botId, settings, usedPrefix, reply }) => {
    const current = settings.self ? 1 : 0;
    const option = String(args[0] || "").toLowerCase();

    if (["enable", "on"].includes(option)) {
      if (current) return reply("《✧》 El modo *Self* ya estaba activado.");
      botconf.set(botId, "self", true);
      return reply("《✧》 Has *Activado* el modo *Self*.");
    }

    if (["disable", "off"].includes(option)) {
      if (!current) return reply("《✧》 El modo *Self* ya estaba desactivado.");
      botconf.set(botId, "self", false);
      return reply("《✧》 Has *Desactivado* el modo *Self*.");
    }

    return reply(
      `*☆ Self (✿❛◡❛)*\n➮ *Estado ›* ${current ? "✓ Activado" : "✗ Desactivado"}\n\n❀ Puedes cambiarlo con:\n> ● _Activar ›_ *${usedPrefix}self enable*\n> ● _Desactivar ›_ *${usedPrefix}self disable*`
    );
  }
});
