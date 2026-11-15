"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");

module.exports = gacha.define({
  commands: ["removesale", "removerventa"],
  description: "Elimina un personaje que pusiste en venta.",
  run: async ({ sock, msg, id, text, usedPrefix, command }) => {
    if (!text) return kit.reply(sock, msg, `❀ Debes especificar un personaje para eliminar.\n> Ejemplo » *${usedPrefix}${command} Rem*`);

    const character = gacha.findCharacterExact(text);
    const sale = character ? gacha.getSale(character.id) : null;
    if (!character || !sale || sale.seller !== id) return kit.reply(sock, msg, `ꕥ El personaje *${text}* no está a la venta por ti.`);

    gacha.deleteSale(character.id);
    return kit.reply(sock, msg, `❀ *${character.name}* ha sido eliminado de la lista de ventas.`);
  }
});
