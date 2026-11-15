"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const pdb = require("../../libs/profiledb");

module.exports = eco.define({
  commands: ["economyboard", "eboard", "baltop"],
  description: "Ver el ranking de usuarios con más coins.",
  run: async ({ sock, msg, chatId, args, usedPrefix, command }) => {
    const rows = eco
      .all(chatId)
      .map((a) => ({ name: pdb.peek(a.id)?.name || a.id, total: a.coins + a.bank }))
      .filter((r) => r.total >= 1000)
      .sort((a, b) => b.total - a.total);
    if (!rows.length) return kit.reply(sock, msg, `ꕥ No hay usuarios en el grupo con más de 1,000 ${eco.currency()}.`);
    const page = parseInt(args[0], 10) || 1;
    const size = 10;
    const pages = Math.ceil(rows.length / size);
    if (page < 1 || page > pages) return kit.reply(sock, msg, `《✧》 La página *${page}* no existe. Hay *${pages}* páginas.`);
    const start = (page - 1) * size;
    let text = "*✩ EconomyBoard (✿◡‿◡)*\n\n";
    text += rows
      .slice(start, start + size)
      .map((r, i) => `✩ ${start + i + 1} › *${r.name}*\n     Total → *${eco.money(r.total)}*`)
      .join("\n");
    text += `\n\n> ⌦ Página *${page}* de *${pages}*`;
    if (page < pages) text += `\n> Para ver la siguiente página › *${usedPrefix + command} ${page + 1}*`;
    return kit.reply(sock, msg, text);
  }
});
