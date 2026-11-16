"use strict";

const kit = require("../../libs/pluginkit");
const gk = require("../../libs/groupkit");
const botconf = require("../../libs/botconf");
const sockkit = require("../../libs/sockkit");

module.exports = sockkit.define({
  commands: ["setprimary"],
  description: "Elegir qué bot responde en este grupo.",
  access: "any",
  run: async ({ sock, msg, args, botId, role, usedPrefix, command, reply }) => {
    const chatId = msg.key.remoteJid;
    if (!chatId.endsWith("@g.us")) return reply("✐ Este comando solo funciona en grupos.");

    const specific = role === "self" || role === "owner" || role === "global";
    if (!specific) {
      const group = await gk.context(sock, msg);
      if (!group.isAdmin) return reply("✐ Este comando solo puede ser usado por administradores del grupo.");
    }

    const current = botconf.primaryOf(chatId);
    const option = String(args[0] || "").toLowerCase();

    if (["reset", "off", "default"].includes(option)) {
      botconf.setPrimary(chatId, "");
      return reply("✿ Se quitó el bot primario. Responderá el principal si está en el grupo.");
    }

    let target = "";
    const mention = kit.getMentions(msg)[0];
    if (mention) target = botconf.number(mention);
    else if (args[0]) target = args[0].replace(/\D/g, "");
    else if (specific) target = botId;

    if (!target) {
      const label = current ? `@${current}` : "ninguno";
      return reply(`✐ Indica el bot que será primario.\n\n✦ *Actual ›* ${label}\n\n> *${usedPrefix}${command} @bot*\n> *${usedPrefix}${command} 573001234567*\n> *${usedPrefix}${command} reset*`, current ? { mentions: [`${current}@s.whatsapp.net`] } : {});
    }

    const present = await botconf.candidatesIn(sock, chatId, botId);
    const chosen = present.find((b) => b.id === target || botconf.number(b.getSock?.()?.user?.lid) === target);
    if (!chosen) return reply("✐ Ese número no es un bot activo en este grupo.\n> Usa *" + usedPrefix + "bots* para ver los disponibles.");

    botconf.setPrimary(chatId, chosen.id);
    return reply(`✿ El bot primario de este grupo ahora es @${chosen.id}`, { mentions: [`${chosen.id}@s.whatsapp.net`] });
  }
});
