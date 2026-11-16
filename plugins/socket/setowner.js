"use strict";

const kit = require("../../libs/pluginkit");
const lid = require("../../libs/lid");
const botconf = require("../../libs/botconf");
const sockkit = require("../../libs/sockkit");

module.exports = sockkit.define({
  commands: ["setowner", "setbotowner"],
  description: "Definir el dueño del bot.",
  run: async ({ sock, msg, args, botId, usedPrefix, command, reply }) => {
    if (["reset", "default"].includes(String(args[0] || "").toLowerCase())) {
      botconf.set(botId, "owner", "");
      return reply("✿ Dueño restablecido.");
    }

    let target = kit.getMentions(msg)[0] || kit.getQuoted(msg)?.sender || "";
    if (target) {
      const resolved = await lid.resolve(sock, target, msg).catch(() => target);
      target = lid.isLid(resolved) ? "" : botconf.number(resolved);
    } else {
      target = args.join("").replace(/\D/g, "");
    }

    if (!/^\d{8,15}$/.test(target)) {
      return reply(`✐ Indica el número, menciona o responde al nuevo dueño.\n> Ejemplo: *${usedPrefix}${command} 573001234567*\n> Para restablecer: *${usedPrefix}${command} reset*`);
    }

    botconf.set(botId, "owner", target);
    return reply(`✿ Dueño actualizado a *@${target}*`, { mentions: [`${target}@s.whatsapp.net`] });
  }
});
