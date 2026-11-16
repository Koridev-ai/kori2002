"use strict";

const botconf = require("../../libs/botconf");
const sockkit = require("../../libs/sockkit");

module.exports = sockkit.define({
  commands: ["setname", "setbotname"],
  description: "Cambiar el nombre del bot en los menús.",
  run: async ({ text, botId, usedPrefix, command, reply }) => {
    if (!text) return reply(`✐ Indica el nuevo nombre.\n> Ejemplo: *${usedPrefix}${command} Mi Bot*\n> Para restablecer: *${usedPrefix}${command} reset*`);
    if (["reset", "default"].includes(text.toLowerCase())) {
      botconf.set(botId, "namebot", "");
      return reply("✿ Nombre restablecido.");
    }
    if (text.length > 40) return reply("✐ El nombre no puede superar los *40* caracteres.");
    botconf.set(botId, "namebot", text);
    return reply(`✿ Nombre actualizado a *${text}*`);
  }
});
