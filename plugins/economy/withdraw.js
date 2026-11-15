"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

module.exports = eco.define({
  commands: ["withdraw", "with", "retirar"],
  description: "Retirar tus coins del banco.",
  run: async ({ sock, msg, me, args, usedPrefix, command }) => {
    const name = eco.currency();
    if (!args[0]) return kit.reply(sock, msg, `《✧》 Ingresa la cantidad de *${name}* que quieras retirar.`);
    const all = args[0].toLowerCase() === "all";
    if (all && me.bank <= 0) return kit.reply(sock, msg, `No tienes suficientes *${name}* en tu Banco para poder retirar.`);
    const count = eco.parseAmount(args[0], me.bank);
    if (!Number.isFinite(count) || count < 1) {
      return kit.reply(sock, msg, `《✧》 Debes retirar una cantidad válida.\n > Ejemplo 1 » *${usedPrefix + command} ¥25000*\n> Ejemplo 2 » *${usedPrefix + command} all*`);
    }
    if (me.bank < count) {
      return kit.reply(sock, msg, `《✧》 No tienes suficientes *${name}* en tu banco para retirar esa cantidad.\n> Solo tienes *${eco.money(me.bank)}* en tu cuenta.`);
    }
    me.bank -= count;
    me.coins += count;
    eco.save();
    return kit.reply(sock, msg, `✎ Has retirado *${eco.money(count)}* del banco, ahora podras usarlo pero tambien podran robartelo.`);
  }
});
