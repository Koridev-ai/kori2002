"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

module.exports = gacha.define({
  commands: ["buychar", "buyc", "buycharacter"],
  description: "Compra un personaje puesto en venta en el mercado.",
  run: async ({ sock, msg, chatId, id, jid, text, usedPrefix, command }) => {
    if (!text) return kit.reply(sock, msg, `❀ Debes especificar un personaje para comprar.\n> Ejemplo » *${usedPrefix}${command} Rem*`);

    const sale = gacha.getSaleByQuery(text);
    if (!sale) return kit.reply(sock, msg, `ꕥ No se ha encontrado al personaje *${text}* en venta.`);
    if (sale.seller === id) return kit.reply(sock, msg, "ꕥ No puedes comprar tu propio personaje.");

    const now = Date.now();
    if (now - sale.listedAt >= gacha.SALE_TTL_MS) {
      gacha.deleteSale(sale.characterId);
      return kit.reply(sock, msg, `ꕥ La venta de *${sale.name}* ha expirado.`);
    }

    const buyer = eco.account(jid);
    if (buyer.coins < sale.price) {
      return kit.reply(sock, msg, `ꕥ No tienes suficiente dinero en la cartera para comprar a *${sale.name}*.\n> Necesitas *${eco.money(sale.price)}*`);
    }

    const sellerJid = gacha.mentionJid(sale.seller);
    const seller = eco.account(sellerJid);
    buyer.coins -= sale.price;
    seller.coins += sale.price;
    eco.save();

    gacha.transferCharacter(sale.characterId, id, now);

    return sock.sendMessage(
      chatId,
      {
        text: `❀ *${sale.name}* ha sido comprado por *${gacha.displayName(id)}*!\n> Se han transferido *${eco.money(sale.price)}* a *${gacha.displayName(sale.seller)}*`,
        mentions: [jid, sellerJid]
      },
      { quoted: msg }
    );
  }
});
