"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

const MIN_PRICE = 2000;
const MAX_PRICE = 100000000;

module.exports = gacha.define({
  commands: ["sell", "vender"],
  description: "Pone en venta un personaje reclamado en el mercado global.",
  run: async ({ sock, msg, id, args, text, usedPrefix, command }) => {
    if (args.length < 2) return kit.reply(sock, msg, `❀ Debes especificar un precio para vender el personaje.\n> Ejemplo » *${usedPrefix}${command} 5000 Rem*`);

    const price = parseInt(args[0].replace(/[,.]/g, ""), 10);
    if (!Number.isFinite(price) || price < MIN_PRICE) return kit.reply(sock, msg, `ꕥ El precio mínimo para vender un personaje es de *${eco.money(MIN_PRICE)}*.`);
    if (price > MAX_PRICE) return kit.reply(sock, msg, `ꕥ El precio máximo permitido para vender un personaje es de *${eco.money(MAX_PRICE)}*.`);

    const query = args.slice(1).join(" ");
    const { matches } = gacha.findOwned(id, query);
    if (!matches.length) return kit.reply(sock, msg, `ꕥ No se ha encontrado al personaje *${query}* reclamado por ti.`);
    if (matches.length > 1) return kit.reply(sock, msg, gacha.ambiguousText(matches, query, usedPrefix, `${command} ${price}`));

    const character = matches[0];
    if (gacha.getSale(character.id)) return kit.reply(sock, msg, `ꕥ *${character.name}* ya está en venta.`);

    gacha.createSale(character.id, id, price, Date.now());

    return kit.reply(
      sock,
      msg,
      `✎ *${character.name}* ha sido puesto a la venta!\n` +
        `❀ Vendedor » *${gacha.displayName(id)}*\n` +
        `⛁ Valor » *${eco.money(price)}*\n` +
        `ⴵ Expira en » *3 días*\n` +
        `> Puedes ver los personajes en venta usando *${usedPrefix}wshop*`
    );
  }
});
