"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const pdb = require("../../libs/profiledb");

module.exports = eco.define({
  commands: ["givecoins", "pay", "coinsgive"],
  description: "Dar coins a un usuario.",
  run: async ({ sock, msg, g, jid, me, args, usedPrefix, command }) => {
    const name = eco.currency();
    let t = gk.target(msg, g);
    if (!t && args[1]) {
      const digits = args[1].replace(/[@ .+-]/g, "");
      const p = digits ? g.find(`${digits}@s.whatsapp.net`) : null;
      if (p) t = { p, jid: p.id, number: digits };
    }
    if (!t) return kit.reply(sock, msg, `❀ Debes mencionar a quien quieras transferir *${name}*.\n> Ejemplo » *${usedPrefix + command} 25000 @mencion*`);
    if (!t.p) return kit.reply(sock, msg, "ꕥ El usuario mencionado no está en este grupo.");
    if (eco.key(t.jid) === eco.key(jid)) return kit.reply(sock, msg, "ꕥ No puedes transferirte *coins* a ti mismo.");
    const amount = eco.parseAmount(args[0], me.bank);
    if (!args[0] || !Number.isFinite(amount) || amount <= 0) return kit.reply(sock, msg, `ꕥ Ingresa una cantidad válida de *${name}* para transferir.`);
    if (me.bank < amount) {
      return kit.reply(sock, msg, `ꕥ No tienes suficientes *${name}* en el banco para transferir.\n> Tu saldo actual: *${eco.money(me.bank)}*`);
    }
    const target = eco.account(g.chatId, t.jid);
    me.bank -= amount;
    target.bank += amount;
    eco.save();
    const label = pdb.peek(t.jid)?.name || `@${t.number}`;
    return kit.reply(sock, msg, `❀ Transferiste *${eco.money(amount)}* a *${label}*\n> Ahora tienes *${eco.money(me.bank)}* en tu banco.`, { mentions: [t.jid] });
  }
});
