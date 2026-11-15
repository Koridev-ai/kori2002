"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

const PER_PAGE = 10;

function formatRemaining(ms) {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${d}d ${h}h ${m}m ${s}s`;
}

module.exports = gacha.define({
  commands: ["wshop", "haremshop", "tiendawaifus"],
  description: "Muestra los personajes puestos en venta en el mercado global.",
  run: async ({ sock, msg, args }) => {
    const now = Date.now();
    const active = [];
    for (const sale of gacha.getSales()) {
      if (now - sale.listedAt >= gacha.SALE_TTL_MS) {
        gacha.deleteSale(sale.characterId);
        continue;
      }
      active.push(sale);
    }

    if (!active.length) return kit.reply(sock, msg, "ꕥ No hay personajes en venta.");

    const page = parseInt(args[0], 10) || 1;
    const totalPages = Math.ceil(active.length / PER_PAGE);
    if (page < 1 || page > totalPages) return kit.reply(sock, msg, `ꕥ Página inválida. Solo hay *${totalPages}* disponible${totalPages > 1 ? "s" : ""}.`);

    const start = (page - 1) * PER_PAGE;
    const end = Math.min(start + PER_PAGE, active.length);
    const lines = [];
    for (let i = start; i < end; i++) {
      const sale = active[i];
      lines.push(
        `❀ *${sale.name}* (✰ ${eco.money(sale.value)}):\n` +
          `⛁ Precio » *${eco.money(sale.price)}*\n` +
          `❖ Vendedor » *${gacha.displayName(sale.seller)}*\n` +
          `ⴵ Expira en » *${formatRemaining(gacha.SALE_TTL_MS - (now - sale.listedAt))}*`
      );
    }

    return kit.reply(sock, msg, `*☆ HaremShop \`≧◠ᴥ◠≦\`*\n❏ Personajes en venta <${active.length}>:\n\n${lines.join("\n\n")}\n\n> • Página *${page}* de *${totalPages}*`);
  }
});
