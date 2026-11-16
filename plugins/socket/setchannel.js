"use strict";

const botconf = require("../../libs/botconf");
const sockkit = require("../../libs/sockkit");

module.exports = sockkit.define({
  commands: ["setchannel", "setbotchannel"],
  description: "Definir el canal de WhatsApp del bot.",
  run: async ({ args, botId, usedPrefix, command, reply }) => {
    const value = args[0] || "";
    if (!value) return reply(`✐ Indica el enlace del canal.\n> Ejemplo: *${usedPrefix}${command} https://whatsapp.com/channel/xxxx*\n> Para quitarlo: *${usedPrefix}${command} reset*`);
    if (["reset", "default"].includes(value.toLowerCase())) {
      botconf.set(botId, "channel", "");
      return reply("✿ Canal eliminado.");
    }
    if (!/^https:\/\/whatsapp\.com\/channel\/[0-9A-Za-z]{10,40}$/i.test(value)) return reply("✐ El enlace del canal no es válido.");
    botconf.set(botId, "channel", value);
    return reply("✿ Canal actualizado.");
  }
});
