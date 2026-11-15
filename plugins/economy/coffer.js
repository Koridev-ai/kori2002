"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const text = require("../../libs/ecotext");

module.exports = eco.define({
  commands: ["cofre", "coffer"],
  description: "Reclamar tu cofre diario.",
  run: async ({ sock, msg, me }) => {
    const wait = eco.remaining(me, "coffer");
    if (wait > 0) return kit.reply(sock, msg, `ꕥ Debes esperar *${eco.formatTime(wait)}* para volver a abrir un cofre.`);
    const roll = Math.random();
    let line;
    if (roll < 0.5) {
      me.coins += 25000;
      line = eco.fill(eco.pick(text.cofferNormal), 25000);
    } else if (roll < 0.8) {
      me.coins += 40000;
      line = eco.fill(eco.pick(text.cofferLegendary), 40000);
    } else {
      line = eco.pick(text.cofferEmpty);
    }
    eco.setCooldown(me, "coffer", 86400000);
    return kit.reply(sock, msg, `「✿」 ${line}`);
  }
});
