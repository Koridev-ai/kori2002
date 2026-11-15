"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

module.exports = eco.define({
  commands: ["dep", "deposit", "d", "depositar"],
  description: "Depositar tus coins en el banco.",
  run: async ({ sock, msg, me, args }) => {
    const name = eco.currency();
    if (!args[0]) return kit.reply(sock, msg, `《✧》 Ingresa la cantidad de *${name}* que quieras *depositar*.`);
    const all = args[0].toLowerCase() === "all";
    if (all && me.coins <= 0) return kit.reply(sock, msg, `✎ No tienes *${name}* para depositar en tu *banco*`);
    const count = eco.parseAmount(args[0], me.coins);
    if (!Number.isFinite(count) || count < 1) return kit.reply(sock, msg, "《✧》 Ingresa una cantidad *válida* para depositar");
    if (me.coins < count) return kit.reply(sock, msg, `❀ No tienes suficientes *${name}* para depositar`);
    me.coins -= count;
    me.bank += count;
    eco.save();
    return kit.reply(sock, msg, `ꕥ Has depositado *${eco.money(count)}* en tu Banco`);
  }
});
