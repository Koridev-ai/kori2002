"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

const OPTIONS = ["piedra", "papel", "tijera"];

function winner(user, bot) {
  if (user === bot) return "tie";
  if ((user === "piedra" && bot === "tijera") || (user === "papel" && bot === "piedra") || (user === "tijera" && bot === "papel")) return "win";
  return "lose";
}

module.exports = eco.define({
  commands: ["ppt"],
  description: "Jugar piedra, papel o tijera con el bot.",
  run: async ({ sock, msg, me, args, usedPrefix, command }) => {
    const botName = sock.user?.name || "Bot";
    const wait = eco.remaining(me, "ppt");
    if (wait > 0) return kit.reply(sock, msg, `ꕥ Debes esperar *${eco.formatTime(wait)}* antes de jugar nuevamente.`);
    const choice = (args[0] || "").trim().toLowerCase();
    if (!OPTIONS.includes(choice)) return kit.reply(sock, msg, `《✧》 Usa el comando así:\n› *${usedPrefix + command} piedra*, *papel* o *tijera*`);
    const botChoice = eco.pick(OPTIONS);
    const result = winner(choice, botChoice);
    const head = (title) => `ꕥ ${title}.\n\n> ✿ *Tu elección ›* ${choice}\n> ✿ *${botName} eligió ›* ${botChoice}`;
    let text;
    if (result === "win") {
      const reward = eco.rand(3000, 5500);
      me.coins += reward;
      text = `${head("Ganaste")}\n> ✿ *${eco.currency()} ›* ¥${reward.toLocaleString()}`;
    } else if (result === "lose") {
      const lost = eco.loseMoney(me, eco.rand(1000, 3000));
      text = `${head("Perdiste")}\n> ✿ *${eco.currency()} ›* -¥${lost.toLocaleString()}`;
    } else {
      const reward = eco.rand(800, 1500);
      me.coins += reward;
      text = `${head("Empate")}\n> ✿ *${eco.currency()} ›* +¥${reward.toLocaleString()}`;
    }
    eco.setCooldown(me, "ppt", 60000);
    return kit.reply(sock, msg, text);
  }
});
