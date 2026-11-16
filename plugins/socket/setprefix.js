"use strict";

const botconf = require("../../libs/botconf");
const sockkit = require("../../libs/sockkit");

const MAX_PREFIXES = 5;

function valid(value) {
  const chars = Array.from(value);
  if (chars.length < 1 || chars.length > 3) return false;
  if (/\s/.test(value)) return false;
  if (/^[\p{L}\p{N}]+$/u.test(value)) return false;
  return true;
}

module.exports = sockkit.define({
  commands: ["setprefix", "setbotprefix"],
  description: "Cambiar el prefijo del bot.",
  run: async ({ args, botId, settings, usedPrefix, command, reply }) => {
    if (!args.length) {
      const current = settings.noprefix ? "sin prefijo" : botconf.prefixes(botId).map((p) => `\`${p}\``).join(" ");
      return reply(`✐ Indica el nuevo prefijo.\n\n✦ *Actual ›* ${current}\n\n> Ejemplos:\n> *${usedPrefix}${command} !*\n> *${usedPrefix}${command} ! # $* (varios, máximo ${MAX_PREFIXES})\n> *${usedPrefix}${command} noprefix*\n> *${usedPrefix}${command} reset*`);
    }

    const first = args[0].toLowerCase();
    if (["reset", "default"].includes(first)) {
      botconf.set(botId, "prefix", null);
      botconf.set(botId, "noprefix", false);
      return reply(`✿ Prefijo restablecido a \`${global.prefix || "."}\``);
    }

    if (["noprefix", "none", "sin"].includes(first)) {
      botconf.set(botId, "noprefix", true);
      return reply("✿ El bot ahora responde *sin prefijo*.");
    }

    const list = [...new Set(args)];
    if (list.length > MAX_PREFIXES) return reply(`✐ Puedes definir como máximo *${MAX_PREFIXES}* prefijos.`);
    const bad = list.find((item) => !valid(item));
    if (bad) return reply(`✐ El prefijo *${bad}* no es válido.\n> Usa de 1 a 3 símbolos o emojis, sin espacios ni letras o números.`);

    botconf.set(botId, "prefix", list);
    botconf.set(botId, "noprefix", false);
    return reply(`✿ Prefijo actualizado a ${list.map((p) => `\`${p}\``).join(" ")}`);
  }
});
