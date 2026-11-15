"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");

const PER_PAGE = 10;

module.exports = gacha.define({
  commands: ["favboard", "favtop", "favoritetop"],
  description: "Muestra el top global de personajes favoritos.",
  run: async ({ sock, msg, args, usedPrefix, command }) => {
    const counts = gacha.getPrimaryCounts();
    if (!counts.length) return kit.reply(sock, msg, `⚠️ Aún nadie tiene un personaje favorito. Márcalo con *${usedPrefix}principal*.`);

    const entries = [];
    for (const c of counts) {
      const character = gacha.getCharacterById(c.characterId);
      if (character) entries.push({ character, total: c.total });
    }
    if (!entries.length) return kit.reply(sock, msg, `⚠️ Aún nadie tiene un personaje favorito. Márcalo con *${usedPrefix}principal*.`);

    const pageArg = args.find((a) => /^\d+$/.test(a));
    const page = pageArg ? parseInt(pageArg, 10) : 1;
    const totalPages = Math.max(1, Math.ceil(entries.length / PER_PAGE));

    if (page < 1 || page > totalPages) return kit.reply(sock, msg, `ꕥ Página no válida. Hay un total de *${totalPages}* páginas.`);

    const start = (page - 1) * PER_PAGE;
    const end = Math.min(start + PER_PAGE, entries.length);

    let message = "✰ *Top de personajes favoritos:*\n\n";
    for (let i = start; i < end; i++) {
      const { character, total } = entries[i];
      message += `#${i + 1} » *${character.name}*\n`;
      message += `   ♡ ${total} favorito${total !== 1 ? "s" : ""}\n`;
    }

    message += `\n⌦ Página *${page}* de *${totalPages}*`;
    if (page < totalPages) message += `\n> Para ver la siguiente página » *${usedPrefix}${command} ${page + 1}*`;

    return kit.reply(sock, msg, message.trim());
  }
});
