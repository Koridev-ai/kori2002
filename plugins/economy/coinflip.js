"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

module.exports = eco.define({
  commands: ["cf", "flip", "coinflip"],
  description: "Apostar coins en un cara o cruz.",
  run: async ({ sock, msg, me, args, usedPrefix, command }) => {
    const wait = eco.remaining(me, "coinflip");
    if (wait > 0) return kit.reply(sock, msg, `ꕥ Debes esperar *${Math.ceil(wait / 1000)} segundos* antes de volver a usar ${command}.`);
    let amount;
    let choice;
    const a0 = parseInt(args[0], 10);
    const a1 = parseInt(args[1], 10);
    if (!isNaN(a0)) {
      amount = a0;
      choice = (args[1] || "").toLowerCase();
    } else if (!isNaN(a1)) {
      amount = a1;
      choice = (args[0] || "").toLowerCase();
    } else {
      return kit.reply(sock, msg, `ꕥ Cantidad inválida, ingresa un número válido.\n> Ejemplo » *${usedPrefix + command} 200 cara* o *${usedPrefix + command} cruz 200*`);
    }
    if (amount < 100) return kit.reply(sock, msg, `ꕥ La cantidad mínima para apostar es *100 ${eco.currency()}*.`);
    if (!["cara", "cruz"].includes(choice)) {
      return kit.reply(sock, msg, `ꕥ Elección inválida. Solo se admite *cara* o *cruz*.\n> Ejemplo » *${usedPrefix + command} 200 cara*`);
    }
    if (amount > me.coins) {
      return kit.reply(sock, msg, `ꕥ No tienes suficientes *${eco.currency()}* fuera del banco para apostar, tienes *${eco.money(me.coins)}*.`);
    }
    eco.setCooldown(me, "coinflip", 10000);
    const result = Math.random() < 0.5 ? "cara" : "cruz";
    const hit = result === choice;
    me.coins += hit ? amount : -amount;
    eco.save();
    return kit.reply(sock, msg, `「✿」La moneda ha caído en *${cap(result)}* y has ${hit ? "ganado" : "perdido"} *${eco.money(amount)}*!\n> Tu elección fue *${cap(choice)}*`);
  }
});
