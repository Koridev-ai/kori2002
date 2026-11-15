"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const text = require("../../libs/ecotext");

module.exports = eco.define({
  commands: ["ritual", "invoke", "invocar"],
  description: "Hacer ritos de invocación.",
  run: async ({ sock, msg, me, usedPrefix }) => {
    if (me.stamina < 10) return kit.reply(sock, msg, `ꕥ No tienes suficiente stamina para realizar un ritual.\n> Usa *${usedPrefix}heal* para curarte.`);
    if (me.magic < 10) return kit.reply(sock, msg, `ꕥ No tienes suficiente magia para realizar un ritual.\n> Usa *${usedPrefix}pocion* para recuperarte.`);
    if (me.health < 10) return kit.reply(sock, msg, `ꕥ No tienes suficiente salud para realizar el ritual.\nUsa *${usedPrefix}heal* para curarte.`);
    if (!me.inventory.totem || me.inventory.totem <= 0) {
      return kit.reply(sock, msg, `ꕥ Necesitas un Tótem de Invocación para realizar el ritual.\n> Compra en la tienda con: *${usedPrefix}buy totem*`);
    }
    const wait = eco.remaining(me, "invoke");
    if (wait > 0) return kit.reply(sock, msg, `ꕥ Debes esperar *${eco.formatTime(wait)}* para invocar otro ritual.`);

    me.stamina -= eco.rand(1, 5);
    me.magic -= eco.rand(1, 12);
    me.health -= eco.rand(1, 15);
    me.inventory.totem -= 1;
    eco.setCooldown(me, "invoke", 12 * 60 * 1000);

    let reward;
    let narration;
    let bonusText = "";
    if (Math.random() < 0.05) {
      reward = eco.rand(11000, 13000);
      narration = eco.pick(text.invokeLegendary);
      bonusText = "\nꕥ Recompensa LEGENDARIA obtenida!";
    } else {
      reward = eco.rand(8000, 11000);
      narration = eco.pick(text.invokeNormal);
      if (Math.random() < 0.15) {
        const bonus = eco.rand(2500, 4500);
        reward += bonus;
        bonusText = `\n「✿」 ¡Energía extra! Ganaste *${bonus.toLocaleString()}* ${eco.currency()} adicionales`;
      }
    }
    me.coins += reward;
    eco.save();
    let caption = `「✿」 ${narration}\nGanaste *${reward.toLocaleString()} ${eco.currency()}*`;
    if (bonusText) caption += `\n${bonusText}`;
    return kit.reply(sock, msg, caption);
  }
});
