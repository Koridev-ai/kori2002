"use strict";

const botconf = require("../../libs/botconf");
const botmedia = require("../../libs/botmedia");
const sockkit = require("../../libs/sockkit");

module.exports = sockkit.define({
  commands: ["seticon", "setboticon"],
  description: "Cambiar el ícono del bot.",
  run: async ({ msg, args, botId, usedPrefix, command, reply }) => {
    if (["reset", "default"].includes(String(args[0] || "").toLowerCase())) {
      botmedia.remove(botId, "icon");
      botconf.set(botId, "icon", "");
      return reply("✿ Ícono restablecido.");
    }
    const buffer = await botmedia.acquire(msg, args);
    if (!buffer) return reply(`✐ Envía o responde a una imagen, o indica un enlace directo.\n> Ejemplo: *${usedPrefix}${command} https://sitio.com/icono.jpg*\n> Para restablecer: *${usedPrefix}${command} reset*`);
    const saved = botmedia.save(botId, "icon", buffer);
    botconf.set(botId, "icon", `icon.${saved.ext}`);
    return reply("✿ Ícono actualizado y guardado.");
  }
});
