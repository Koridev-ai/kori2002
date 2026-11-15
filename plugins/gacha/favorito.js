"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

module.exports = gacha.define({
  commands: ["principal", "setmain", "waifuprincipal", "setfav", "setfavourite"],
  description: "Marca uno de tus personajes reclamados como tu principal.",
  run: async ({ sock, msg, id, text, usedPrefix, command }) => {
    const { owned, matches } = gacha.findOwned(id, text);

    if (!text) {
      const primaryId = gacha.getPrimaryCharacter(id);
      const current = primaryId ? owned.find((c) => c.id === primaryId) : null;
      if (!current) return kit.reply(sock, msg, `ꕥ No tienes un personaje principal.\n\n✐ Usa *${usedPrefix}${command} <nombre o ID>* para elegir uno.`);
      return kit.reply(sock, msg, `★ Tu personaje principal es *${current.name}* \`${current.id}\` (*${eco.money(current.value)}*)`);
    }

    if (["quitar", "remove", "ninguno"].includes(text.toLowerCase())) {
      gacha.clearPrimaryCharacter(id);
      return kit.reply(sock, msg, "ꕥ Ya no tienes un personaje principal.");
    }

    if (!owned.length) return kit.reply(sock, msg, "ꕥ No tienes personajes reclamados.");
    if (!matches.length) return kit.reply(sock, msg, `❀ No encontré ese personaje en tu harem.\n\n✐ Usa *${usedPrefix}harem* para ver tu lista.`);
    if (matches.length > 1) return kit.reply(sock, msg, gacha.ambiguousText(matches, text, usedPrefix, command));

    gacha.setPrimaryCharacter(id, matches[0].id);
    return kit.reply(sock, msg, `★ *${matches[0].name}* \`${matches[0].id}\` ahora es tu personaje principal.`);
  }
});
