"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const gdb = require("../../libs/groupdb");
const pdb = require("../../libs/profiledb");

module.exports = eco.define({
  commands: ["robar", "steal", "rob"],
  description: "Intentar robar coins a un usuario.",
  run: async ({ sock, msg, g, jid, me, usedPrefix, command }) => {
    const wait = eco.remaining(me, "steal");
    if (wait > 0) return kit.reply(sock, msg, `ꕥ Debes esperar *${eco.formatTime(wait)}* para usar *${usedPrefix + command}* de nuevo.`);
    const t = gk.target(msg, g);
    if (!t) return kit.reply(sock, msg, "❀ Debes mencionar a alguien para intentar robarle.");
    if (t.ids.some((id) => eco.key(id) === eco.key(jid))) return kit.reply(sock, msg, "ꕥ No puedes robarte a ti mismo.");
    const target = eco.peekAny(t.ids);
    if (!t || !t.p || !target) return kit.reply(sock, msg, "ꕥ El usuario no se encuentra en mi base de datos.");
    const name = pdb.peekAny(t.ids)?.name || `@${t.number}`;
    const lastSeen = t.ids.map((id) => gdb.peekUser(g.chatId, id)).find(Boolean)?.last || 0;
    if (Date.now() - lastSeen < 3600000) {
      return kit.reply(sock, msg, `ꕥ Solo puedes robarle *${eco.currency()}* a un usuario si estuvo más de 1 hora inactivo.`);
    }
    if (Math.random() < 0.3) {
      const lost = eco.loseMoney(me, eco.rand(2000, 5000));
      eco.setCooldown(me, "steal", 3600000);
      return kit.reply(sock, msg, `ꕥ El robo salió mal y perdiste *${eco.money(lost)}*.`);
    }
    const stolen = eco.rand(3000, 9000);
    if (target.coins < stolen) {
      return kit.reply(sock, msg, `ꕥ *${name}* no tiene suficientes *${eco.currency()}* fuera del banco como para que valga la pena intentar robar.`, { mentions: [t.jid] });
    }
    me.coins += stolen;
    target.coins -= stolen;
    eco.setCooldown(me, "steal", 3600000);
    return kit.reply(sock, msg, `❀ Le robaste *${eco.money(stolen)}* a *${name}*`, { mentions: [t.jid] });
  }
});
