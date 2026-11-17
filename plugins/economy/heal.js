"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const pdb = require("../../libs/profiledb");

module.exports = eco.define({
  commands: ["heal", "curar", "pocion", "potion"],
  description: "Curar salud para salir de aventuras.",
  run: async ({ sock, msg, g, me, usedPrefix, command }) => {
    const t = gk.target(msg, g);
    let target = me;
    let label = "";
    if (t) {
      target = eco.peekAny(t.ids);
      if (!target) return kit.reply(sock, msg, "「✎」 El usuario mencionado no está registrado en el bot.");
      label = pdb.peekAny(t.ids)?.name || `@${t.number}`;
    }
    const mentions = t ? [t.jid] : [];
    const cmd = command.toLowerCase();

    if (cmd === "pocion" || cmd === "potion") {
      if (!me.inventory.pocion || me.inventory.pocion <= 0) return kit.reply(sock, msg, `ꕥ No tienes poción en tu inventario.\n> Compra una en la tienda: ${usedPrefix}shop`);
      const missing = 100 - target.magic;
      if (missing <= 0) {
        return kit.reply(sock, msg, t ? `ꕥ La magia de *${label}* ya está al máximo, Magia actual: ${target.magic}/100` : `ꕥ Tu magia ya está al máximo, Magia actual: ${target.magic}/100`, { mentions });
      }
      me.inventory.pocion -= 1;
      if (me.inventory.pocion <= 0) delete me.inventory.pocion;
      target.magic += missing;
      eco.save();
      const info = t
        ? `ꕥ Has usado una poción en *${label}* y restauraste *${missing}* puntos de magia.\n> Magia actual: ${target.magic}/100`
        : `ꕥ Has usado una poción y restauraste *${missing}* puntos de magia.\n> Magia actual: ${target.magic}/100`;
      return kit.reply(sock, msg, info, { mentions });
    }

    const missingHealth = 100 - target.health;
    const missingStamina = 100 - target.stamina;
    if (missingHealth <= 0 && missingStamina <= 0) {
      return kit.reply(sock, msg, t ? `ꕥ La salud y stamina de *${label}* ya están al máximo.\n> Salud: ${target.health}/100 | Stamina: ${target.stamina}/100` : `ꕥ Tu salud y stamina ya están al máximo.\n> Salud: ${target.health}/100 | Stamina: ${target.stamina}/100`, { mentions });
    }
    const costHealth = Math.ceil(Math.max(missingHealth, 0) / 10) * 500;
    const costStamina = Math.ceil(Math.max(missingStamina, 0) / 10) * 300;
    const total = costHealth + costStamina;
    if (me.coins + me.bank < total) {
      const lines = [];
      if (missingHealth > 0) lines.push(`Salud: *¥${costHealth.toLocaleString()}*`);
      if (missingStamina > 0) lines.push(`Stamina: *¥${costStamina.toLocaleString()}*`);
      return kit.reply(sock, msg, `ꕥ No tienes suficientes ${eco.currency()} para ${t ? `curar a *${label}*` : "curarte"}.\n> Costos:\n> ${lines.join("\n> ")}\n> Total necesario: *${eco.money(total)}*`, { mentions });
    }
    eco.loseMoney(me, total);
    const healed = [];
    if (missingHealth > 0) {
      target.health = 100;
      healed.push("salud");
    }
    if (missingStamina > 0) {
      target.stamina = 100;
      healed.push("stamina");
    }
    eco.save();
    const what = healed.length === 1 ? healed[0] : "salud y stamina";
    let text = t ? `ꕥ Has curado a *${label}* hasta el máximo nivel de ${what}.` : `ꕥ Te has curado hasta el máximo nivel de ${what}.`;
    if (missingHealth > 0) text += `\n> Costo salud: *¥${costHealth.toLocaleString()}*`;
    if (missingStamina > 0) text += `\n> Costo stamina: *¥${costStamina.toLocaleString()}*`;
    text += `\n> Salud actual: ${target.health}/100\n> Stamina actual: ${target.stamina}/100`;
    return kit.reply(sock, msg, text, { mentions });
  }
});
