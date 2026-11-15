"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const text = require("../../libs/ecotext");
const actions = require("../../libs/ecoactions");

module.exports = eco.define({
  commands: ["w", "work", "chambear", "trabajar"],
  description: "Ganar coins trabajando.",
  run: async ({ sock, msg, me, usedPrefix, command }) => {
    const blocked = actions.cooldownMessage(me, "work", usedPrefix, command);
    if (blocked) return kit.reply(sock, msg, blocked);
    const gain = eco.rand(2000, 4000);
    me.coins += gain;
    eco.setCooldown(me, "work", 3 * 60 * 1000);
    return kit.reply(sock, msg, `❀ ${eco.pick(text.work)} *${eco.money(gain)}*.`);
  }
});
