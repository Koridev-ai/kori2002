"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const text = require("../../libs/ecotext");

module.exports = eco.define({
  commands: ["mine", "minar"],
  description: "Realizar trabajos de minería y ganar coins.",
  run: async ({ sock, msg, me, usedPrefix }) => {
    const staminaCost = eco.rand(1, 5);
    if (me.stamina < staminaCost) {
      return kit.reply(sock, msg, `ꕥ No tienes suficiente energía para ir a minar.\n> Usa *${usedPrefix}heal* para curarte.`);
    }
    if (!me.tools.pico) {
      return kit.reply(sock, msg, `ꕥ Necesitas un Pico para minar.\n> Compra uno en la tienda con: *${usedPrefix}buy pico*`);
    }
    if (me.tools.pico.durability <= 10) {
      delete me.tools.pico;
      eco.save();
      return kit.reply(sock, msg, `ꕥ Tu Pico se ha roto por el uso y ha sido eliminado de tu inventario.\n> Compra uno nuevo con: *${usedPrefix}buy pico*`);
    }
    const wait = eco.remaining(me, "mine");
    if (wait > 0) return kit.reply(sock, msg, `ꕥ Debes esperar *${eco.formatTime(wait)}* para minar de nuevo.`);

    me.stamina -= staminaCost;
    me.tools.pico.durability -= eco.rand(1, 15);
    if (me.tools.pico.durability <= 10) delete me.tools.pico;
    eco.setCooldown(me, "mine", 10 * 60 * 1000);

    let reward;
    let narration;
    let bonusText = "";
    if (Math.random() < 0.02) {
      reward = eco.rand(11000, 13000);
      narration = "¡DESCUBRISTE UN TESORO LEGENDARIO!\n\n";
      bonusText = "\nꕥ Recompensa ÉPICA obtenida!";
    } else {
      reward = eco.rand(7000, 9500);
      narration = `En ${eco.pick(text.mineScenes)}, ${eco.pick(text.mineFinds)}`;
      if (Math.random() < 0.1) {
        const bonus = eco.rand(2500, 4500);
        reward += bonus;
        bonusText = `\n「✿」 ¡Bonus de minería! Ganaste *${bonus.toLocaleString()}* ${eco.currency()} extra`;
      }
    }
    me.coins += reward;
    eco.save();
    let caption = `「✿」 ${narration} *${reward.toLocaleString()} ${eco.currency()}*`;
    if (bonusText) caption += `\n${bonusText}`;
    return kit.reply(sock, msg, caption);
  }
});
