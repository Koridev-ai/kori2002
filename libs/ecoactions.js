"use strict";

const kit = require("./pluginkit");
const eco = require("./ecokit");
const text = require("./ecotext");

function cooldownMessage(me, name, usedPrefix, command) {
  const wait = eco.remaining(me, name);
  return wait > 0 ? `ꕥ Debes esperar *${eco.formatTime(wait)}* para usar *${usedPrefix + command}* de nuevo.` : null;
}

function gatherPlugin(cfg) {
  return eco.define({
    commands: cfg.commands,
    description: cfg.description,
    run: async ({ sock, msg, me, usedPrefix }) => {
      const bag = me[cfg.bag];
      const staminaCost = eco.rand(1, 5);
      if (me.stamina < staminaCost) {
        return kit.reply(sock, msg, `ꕥ No tienes suficiente ${cfg.energy} para ${cfg.needEnergy}.\n> Usa *${usedPrefix}heal* para curarte.`);
      }
      if (!bag[cfg.tool]) {
        return kit.reply(sock, msg, `ꕥ Necesitas ${cfg.toolText} para ${cfg.verb}.\n> Compra ${cfg.buyText} en la tienda con: *${usedPrefix}buy ${cfg.tool}*`);
      }
      if (bag[cfg.tool].durability <= 10) {
        delete bag[cfg.tool];
        eco.save();
        return kit.reply(sock, msg, `ꕥ Tu ${cfg.toolName} se ha roto por el uso y ha sido ${cfg.removed} de tu inventario.\n> Compra ${cfg.newText} con: *${usedPrefix}buy ${cfg.tool}*`);
      }
      const wait = eco.remaining(me, cfg.name);
      if (wait > 0) return kit.reply(sock, msg, `ꕥ Debes esperar *${eco.formatTime(wait)}* antes de volver a ${cfg.again}.`);

      me.stamina -= staminaCost;
      const roll = Math.random();
      const wear = eco.rand(1, 15);
      let message;
      if (roll < 0.4 || roll < 0.7) {
        bag[cfg.tool].durability -= wear;
        if (bag[cfg.tool].durability <= 10) delete bag[cfg.tool];
        if (roll < 0.4) {
          const gain = eco.rand(cfg.win[0], cfg.win[1]);
          me.coins += gain;
          message = eco.fill(eco.pick(text[cfg.key + "Win"]), gain);
        } else {
          const lost = eco.loseMoney(me, eco.rand(cfg.lose[0], cfg.lose[1]));
          message = eco.fill(eco.pick(text[cfg.key + "Lose"]), lost);
        }
      } else {
        message = eco.pick(text[cfg.key + "Neutral"]);
      }
      eco.setCooldown(me, cfg.name, cfg.cooldown);
      return kit.reply(sock, msg, `「✿」 ${message}`);
    }
  });
}

function riskPlugin(cfg) {
  return eco.define({
    commands: cfg.commands,
    description: cfg.description,
    run: async ({ sock, msg, me, usedPrefix, command }) => {
      const wait = eco.remaining(me, cfg.name);
      if (wait > 0) return kit.reply(sock, msg, cfg.waitText(eco.formatTime(wait), usedPrefix, command));
      const win = Math.random() < cfg.chance;
      let amount;
      if (win) {
        amount = eco.rand(cfg.win[0], cfg.win[1]);
        me.coins += amount;
      } else {
        amount = eco.loseMoney(me, eco.rand(cfg.lose[0], cfg.lose[1]));
      }
      eco.setCooldown(me, cfg.name, cfg.cooldown);
      const line = eco.fill(eco.pick(win ? text[cfg.key + "Win"] : text[cfg.key + "Lose"]), amount);
      return kit.reply(sock, msg, `「✿」 ${line}`);
    }
  });
}

function questPlugin(cfg) {
  return eco.define({
    commands: cfg.commands,
    description: cfg.description,
    run: async ({ sock, msg, me, usedPrefix }) => {
      const staminaCost = eco.rand(1, 5);
      if (me.stamina < staminaCost) {
        return kit.reply(sock, msg, `ꕥ No tienes suficiente stamina para ${cfg.staminaText}.\n> Usa *${usedPrefix}heal* para curarte.`);
      }
      const weapon = me.weapons[cfg.weapon];
      let magicCost = 0;
      if (weapon) {
        if (weapon.durability <= 10) {
          delete me.weapons[cfg.weapon];
          eco.save();
          return kit.reply(sock, msg, `ꕥ Tu ${cfg.weaponName} se ha roto por el uso y ha sido eliminad${cfg.gender} de tu inventario.\n> Compra un${cfg.gender === "a" ? "a nueva" : " nuevo"} con: *${usedPrefix}buy ${cfg.weapon}*`);
        }
      } else {
        magicCost = eco.rand(1, 12);
        if (me.magic < magicCost) {
          return kit.reply(sock, msg, `ꕥ Tu magia está agotada y no tienes un arma.\n> Toma una poción para reabastecer tu magia o compra un arma con: *${usedPrefix}buy ${cfg.weapon}*`);
        }
      }
      if (me.health < 5) return kit.reply(sock, msg, `ꕥ No tienes suficiente salud para ${cfg.healthText}.\n> Usa *${usedPrefix}heal* para curarte.`);
      const wait = eco.remaining(me, cfg.name);
      if (wait > 0) return kit.reply(sock, msg, `ꕥ Debes esperar *${eco.formatTime(wait)}* antes de ${cfg.againText}.`);

      me.stamina -= staminaCost;
      me.magic -= magicCost;
      const roll = Math.random();
      const damage = eco.rand(1, cfg.damage);
      let message;
      if (roll < 0.7 && weapon) {
        weapon.durability -= eco.rand(1, 15);
        if (weapon.durability <= 10) delete me.weapons[cfg.weapon];
      }
      if (roll < 0.4) {
        const gain = eco.rand(cfg.win[0], cfg.win[1]);
        me.coins += gain;
        me.health = Math.max(0, me.health - damage);
        message = eco.fill(eco.pick(text[cfg.key + "Win"]), gain);
      } else if (roll < 0.7) {
        const lost = eco.loseMoney(me, eco.rand(cfg.lose[0], cfg.lose[1]));
        me.health = Math.max(0, me.health - damage);
        message = eco.fill(eco.pick(text[cfg.key + "Lose"]), lost);
      } else {
        message = eco.pick(text[cfg.key + "Neutral"]);
      }
      eco.setCooldown(me, cfg.name, cfg.cooldown);
      return kit.reply(sock, msg, `「✿」 ${message}`);
    }
  });
}

module.exports = { gatherPlugin, riskPlugin, questPlugin, cooldownMessage };
