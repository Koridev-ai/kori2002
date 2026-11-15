"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

const SERIES_PER_PAGE = 20;
const CHARACTERS_PER_PAGE = 20;

module.exports = gacha.define({
  commands: ["serie", "series", "catalogo", "idlist", "personajes"],
  description: "Lista las series o los personajes (con ID) de una serie.",
  run: async ({ sock, msg, args, text, usedPrefix, command }) => {
    if (!text || /^\d+$/.test(text)) {
      const series = gacha.getSeriesList();
      if (!series.length) return kit.reply(sock, msg, "⚠️ Aún no hay series en el catálogo. Un owner puede generarlas con *genchar*.");

      const pageArg = args.find((a) => /^\d+$/.test(a));
      const page = pageArg ? parseInt(pageArg, 10) : 1;
      const totalPages = Math.ceil(series.length / SERIES_PER_PAGE);
      if (page < 1 || page > totalPages) return kit.reply(sock, msg, `ꕥ Página no válida. Hay un total de *${totalPages}* páginas.`);

      const start = (page - 1) * SERIES_PER_PAGE;
      const end = Math.min(start + SERIES_PER_PAGE, series.length);
      let message = `*❏ Series disponibles (${series.length}):*\n\n`;
      for (let i = start; i < end; i++) message += `» *${series[i].series}* (${series[i].total})\n`;
      message += `\n> • _Página ${page}/${totalPages}_`;
      message += `\n> Usa *${usedPrefix}${command} <serie>* para ver sus personajes.`;
      return kit.reply(sock, msg, message.trim());
    }

    let page = 1;
    let queryArgs = args;
    const last = args[args.length - 1];
    if (args.length > 1 && /^\d+$/.test(last) && parseInt(last, 10) > 0) {
      page = parseInt(last, 10);
      queryArgs = args.slice(0, -1);
    }

    const query = queryArgs.join(" ").trim();
    const seriesName = gacha.findSeries(query);
    if (!seriesName) return kit.reply(sock, msg, `ꕥ No se encontró la serie *${query}*.`);

    const characters = gacha.getCharactersBySeries(seriesName);
    const total = characters.length;
    const claimedCount = characters.filter((c) => gacha.getOwner(c.id)).length;
    const totalPages = Math.max(1, Math.ceil(total / CHARACTERS_PER_PAGE));
    if (page < 1 || page > totalPages) return kit.reply(sock, msg, `❀ Página no válida. Hay un total de *${totalPages}* páginas.`);

    const start = (page - 1) * CHARACTERS_PER_PAGE;
    const end = Math.min(start + CHARACTERS_PER_PAGE, total);

    let message = `*❀ Serie: \`<${seriesName}>\`*\n\n❏ Personajes » *${total}*\n♡ Reclamados » *${claimedCount}/${total}*\n\n`;
    for (let i = start; i < end; i++) {
      const c = characters[i];
      const owner = gacha.getOwner(c.id);
      const status = owner ? `Reclamado por *${gacha.displayName(owner)}*` : "Libre";
      message += `» *${c.name}* \`${c.id}\` (*${eco.money(c.value)}*) • ${status}\n`;
    }
    message += `\n> ⌦ _Página *${page}* de *${totalPages}*_`;
    if (page < totalPages) message += `\n> Usa *${usedPrefix}${command} ${queryArgs.join(" ")} ${page + 1}* para ver la siguiente página.`;

    return kit.reply(sock, msg, message.trim());
  }
});
