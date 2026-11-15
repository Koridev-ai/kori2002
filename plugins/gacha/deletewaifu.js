"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");

module.exports = gacha.define({
  commands: ["deletewaifu", "delchar", "delwaifu"],
  description: "Elimina un personaje reclamado de tu harem.",
  run: async ({ sock, msg, id, text, usedPrefix, command }) => {
    const { owned, matches } = gacha.findOwned(id, text);
    if (!owned.length) return kit.reply(sock, msg, "❀ No tienes personajes reclamados en tu harem.");
    if (!text) return kit.reply(sock, msg, `❀ Debes especificar un personaje para eliminar.\n> Ejemplo » *${usedPrefix}${command} Rem*`);
    if (!matches.length) return kit.reply(sock, msg, `ꕥ *${text}* no está reclamado por ti.`);
    if (matches.length > 1) return kit.reply(sock, msg, gacha.ambiguousText(matches, text, usedPrefix, command));

    gacha.releaseCharacter(matches[0].id);
    return kit.reply(sock, msg, `❀ *${matches[0].name}* ha sido eliminado de tu lista de reclamados.`);
  }
});
