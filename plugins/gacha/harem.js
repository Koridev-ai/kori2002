"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

const PER_PAGE = 20;

module.exports = gacha.define({
  commands: ["harem", "waifus", "claims"],
  description: "Muestra los personajes reclamados de un usuario.",
  run: async ({ sock, msg, chatId, id, args, usedPrefix, command }) => {
    const t = gacha.target(msg);
    const targetId = t ? t.id : id;
    const targetJid = t ? t.jid : gacha.mentionJid(id);
    const name = gacha.displayName(targetId);

    const owned = gacha.getUserCharacters(targetId);
    if (!owned.length) {
      const text = targetId === id ? "ꕥ No tienes personajes reclamados." : `ꕥ *${name}* no tiene personajes reclamados.`;
      return sock.sendMessage(chatId, { text, mentions: [targetJid] }, { quoted: msg });
    }

    const primaryId = gacha.getPrimaryCharacter(targetId);
    const pageArg = args.find((a) => /^\d+$/.test(a));
    const page = pageArg ? parseInt(pageArg, 10) : 1;
    const totalPages = Math.ceil(owned.length / PER_PAGE);
    if (page < 1 || page > totalPages) return kit.reply(sock, msg, `❀ Página no válida. Hay un total de *${totalPages}* páginas.`);

    const start = (page - 1) * PER_PAGE;
    const end = Math.min(start + PER_PAGE, owned.length);

    let message = `✿ Personajes reclamados ✿\n⌦ Usuario: *${name}*\n♡ Personajes: *(${owned.length})*\n\n`;
    for (let i = start; i < end; i++) {
      const c = owned[i];
      message += `${c.id === primaryId ? "★" : "»"} *${c.name}* \`${c.id}\` (*${eco.money(c.value)}*)\n`;
    }
    message += `\n⌦ _Página *${page}* de *${totalPages}*_`;
    if (page < totalPages) message += `\n> Usa *${usedPrefix}${command} ${page + 1}* para ver la siguiente página.`;

    return sock.sendMessage(chatId, { text: message.trim(), mentions: [targetJid] }, { quoted: msg });
  }
});
