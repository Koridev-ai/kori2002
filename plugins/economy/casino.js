"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const pdb = require("../../libs/profiledb");
const gk = require("../../libs/groupkit");

module.exports = eco.define({
  commands: ["apostar", "casino"],
  description: "Apostar coins en el casino.",
  run: async ({ sock, msg, jid, me, args, usedPrefix, command, chatId }) => {
    const botName = sock.user?.name || "Bot";
    const wait = eco.remaining(me, "casino");
    if (wait > 0) return kit.reply(sock, msg, `ꕥ Debes esperar *${eco.formatTime(wait)}* para usar *${usedPrefix + command}* nuevamente.`);
    if (!args[0]) {
      return kit.reply(sock, msg, `❀ Ingresa la cantidad de *${eco.currency()}* que deseas aportar contra *${botName}*\n> Ejemplo: *${usedPrefix + command} 100*`);
    }
    const bet = Math.max(1, eco.parseAmount(args[0], me.coins));
    if (!Number.isFinite(bet)) return kit.reply(sock, msg, "ꕥ Ingresa una cantidad válida para apostar.");
    if (me.coins < bet) return kit.reply(sock, msg, `ꕥ No tienes *¥${bet.toLocaleString()} ${eco.currency()}* para apostar!`);

    const bot = eco.rand(0, 100);
    const you = eco.rand(0, 54);
    const name = pdb.peek(jid)?.name || msg.pushName || gk.mention(jid).slice(1);
    eco.setCooldown(me, "casino", 30000);
    me.coins -= bet;
    let result;
    if (bot > you) {
      result = `> ${name}, *Perdiste ¥${bet.toLocaleString()} ${eco.currency()}*.`;
    } else {
      const prize = bot < you ? bet * 2 : bet;
      me.coins += prize;
      result = `> ${name}, *Ganaste ¥${prize.toLocaleString()} ${eco.currency()}*.`;
    }
    eco.save();

    const sent = await sock.sendMessage(chatId, { text: "❀ El crupier lanza los dados... ¡Las apuestas están cerradas!" }, { quoted: msg });
    await eco.sleep(2000);
    await sock.sendMessage(chatId, { text: "❀ Los números están girando... ¡Prepárate para el resultado!", edit: sent.key });
    await eco.sleep(2000);
    return sock.sendMessage(chatId, { text: `❀ \`Veamos qué números tienen!\`\n\n➠ *${botName}* : ${bot}\n➠ *${name}* : ${you}\n\n${result}`, edit: sent.key });
  }
});
