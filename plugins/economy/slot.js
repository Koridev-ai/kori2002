"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

const SYMBOLS = ["✾", "❃", "❁"];
const roll = () => Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => eco.pick(SYMBOLS)));
const board = ([x, y, z]) => `${x[0]} : ${y[0]} : ${z[0]}\n${x[1]} : ${y[1]} : ${z[1]}\n${x[2]} : ${y[2]} : ${z[2]}`;
const frame = (rows, footer = "") => `「✿」| *SLOTS* \n────────\n${rows}\n────────${footer}`;

module.exports = eco.define({
  commands: ["slot"],
  description: "Apostar coins en el casino.",
  run: async ({ sock, msg, me, args, usedPrefix, command, chatId }) => {
    const currency = eco.currency();
    const bet = parseInt(args[0], 10);
    if (!args[0] || isNaN(bet) || bet <= 0) return kit.reply(sock, msg, "❀ Por favor, ingresa la cantidad que deseas apostar.");
    const wait = eco.remaining(me, "slot");
    if (wait > 0) return kit.reply(sock, msg, `ꕥ Debes esperar *${eco.formatTime(wait)}* para usar *${usedPrefix + command}* nuevamente.`);
    if (bet < 100) return kit.reply(sock, msg, `ꕥ El mínimo para apostar es de 100 *${currency}*.`);
    if (me.coins < bet) return kit.reply(sock, msg, `ꕥ Tus *${currency}* no son suficientes para apostar esa cantidad.`);

    const sent = await sock.sendMessage(chatId, { text: "「✿」| *SLOTS* \n────────\n" }, { quoted: msg });
    for (let i = 0; i < 5; i++) {
      await sock.sendMessage(chatId, { text: frame(board(roll())), edit: sent.key });
      await eco.sleep(300);
    }
    const final = roll();
    const [x, y, z] = final;
    let result;
    if (x[0] === y[0] && y[0] === z[0]) {
      result = `❀ Ganaste! *¥${(bet * 2).toLocaleString()} ${currency}*.`;
      me.coins += bet;
    } else if (x[0] === y[0] || x[0] === z[0] || y[0] === z[0]) {
      result = `❀ Casi lo logras. *Toma ¥10 ${currency}* por intentarlo.`;
      me.coins += 10;
    } else {
      result = `❀ Perdiste *¥${bet.toLocaleString()} ${currency}*.`;
      me.coins -= bet;
    }
    eco.setCooldown(me, "slot", 30000);
    return sock.sendMessage(chatId, { text: frame(board(final), `\n${result}`), edit: sent.key });
  }
});
