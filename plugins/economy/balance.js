"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const pdb = require("../../libs/profiledb");

module.exports = eco.define({
  commands: ["balance", "bal", "coins", "bank"],
  description: "Ver cuantos coins tienes.",
  run: async ({ sock, msg, g, jid, me, usedPrefix }) => {
    const t = gk.target(msg, g);
    const who = t ? t.jid : jid;
    const account = t ? eco.peek(who) : me;
    if (!account) return kit.reply(sock, msg, "「✎」 El usuario mencionado no está registrado en el bot.");
    const name = pdb.peek(who)?.name || gk.mention(who).slice(1);
    const text = `✿ Usuario \`<${name}>\`\n\n⛀ Cartera › *${eco.money(account.coins)}*\n⚿ Banco › *${eco.money(account.bank)}*\n⛁ Total › *${eco.money(account.coins + account.bank)}*\n\n> _Para proteger tu dinero, ¡depósitalo en el banco usando ${usedPrefix}deposit!_`;
    return kit.reply(sock, msg, text);
  }
});
