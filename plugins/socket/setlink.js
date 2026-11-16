"use strict";

const botconf = require("../../libs/botconf");
const sockkit = require("../../libs/sockkit");

module.exports = sockkit.define({
  commands: ["setlink", "setbotlink"],
  description: "Definir el enlace de grupo o comunidad del bot.",
  run: async ({ args, botId, usedPrefix, command, reply }) => {
    const value = args[0] || "";
    if (!value) return reply(`✐ Indica el enlace.\n> Ejemplo: *${usedPrefix}${command} https://chat.whatsapp.com/xxxx*\n> Para quitarlo: *${usedPrefix}${command} reset*`);
    if (["reset", "default"].includes(value.toLowerCase())) {
      botconf.set(botId, "link", "");
      return reply("✿ Enlace eliminado.");
    }
    if (!/^https:\/\/[^\s]{4,200}$/i.test(value)) return reply("✐ El enlace debe empezar con *https://* y no superar los 200 caracteres.");
    botconf.set(botId, "link", value);
    return reply("✿ Enlace actualizado.");
  }
});
