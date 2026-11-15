"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

module.exports = eco.define({
  commands: ["rt", "roulette", "ruleta"],
  description: "Apostar coins en una ruleta.",
  run: async ({ sock, msg, jid, me, args }) => {
    const currency = eco.currency();
    const wait = eco.remaining(me, "roulette");
    if (wait > 0) return kit.reply(sock, msg, `ꕥ Debes esperar *${Math.ceil(wait / 1000)} segundos* antes de volver a usar rt.`);
    if (args.length < 2) return kit.reply(sock, msg, `《✧》 Debes ingresar una cantidad de ${currency} y apostar a un color.`);
    let amount;
    let color;
    if (!isNaN(parseInt(args[0], 10))) {
      amount = parseInt(args[0], 10);
      color = args[1].toLowerCase();
    } else if (!isNaN(parseInt(args[1], 10))) {
      color = args[0].toLowerCase();
      amount = parseInt(args[1], 10);
    } else {
      return kit.reply(sock, msg, "《✧》 Formato inválido. Ejemplo: *rt 2000 black* o *rt black 2000*");
    }
    if (amount < 200) return kit.reply(sock, msg, `《✧》 La cantidad mínima de ${currency} a apostar es 200.`);
    if (!["red", "black", "green"].includes(color)) return kit.reply(sock, msg, "《✧》 Por favor, elige un color válido: red, black, green.");
    if (me.coins < amount) return kit.reply(sock, msg, `《✧》 No tienes suficientes *${currency}* para hacer esta apuesta.`);
    eco.setCooldown(me, "roulette", 30000);
    const spin = eco.rand(0, 36);
    const outcome = spin < 9 ? "green" : spin < 23 ? "red" : "black";
    if (outcome === color) {
      const reward = amount * (outcome === "green" ? 5 : 2);
      me.coins += reward;
      eco.save();
      return kit.reply(sock, msg, `「✿」 La ruleta salió en *${outcome}* y has ganado *${eco.money(reward)}*.`, { mentions: [jid] });
    }
    me.coins -= amount;
    eco.save();
    return kit.reply(sock, msg, `「✿」 La ruleta salió en *${outcome}* y has perdido *${eco.money(amount)}*.`, { mentions: [jid] });
  }
});
