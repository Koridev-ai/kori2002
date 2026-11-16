"use strict";

const botconf = require("../../libs/botconf");
const botmedia = require("../../libs/botmedia");
const sockkit = require("../../libs/sockkit");

module.exports = sockkit.define({
  commands: ["setbanner", "setbotbanner"],
  description: "Cambiar el banner del menú del bot.",
  run: async ({ msg, args, botId, usedPrefix, command, reply }) => {
    if (["reset", "default"].includes(String(args[0] || "").toLowerCase())) {
      botmedia.remove(botId, "banner");
      botconf.set(botId, "banner", "");
      return reply("✿ Banner restablecido.");
    }
    const buffer = await botmedia.acquire(msg, args);
    if (!buffer) return reply(`✐ Envía o responde a una imagen, o indica un enlace directo.\n> Ejemplo: *${usedPrefix}${command} https://sitio.com/banner.jpg*\n> Para restablecer: *${usedPrefix}${command} reset*`);
    const saved = botmedia.save(botId, "banner", buffer);
    botconf.set(botId, "banner", `banner.${saved.ext}`);
    return reply("✿ Banner actualizado y guardado.");
  }
});
