"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

const status = (check) => (check.ready ? "Disponible" : eco.formatTime(check.remainingMs));

module.exports = gacha.define({
  commands: ["gachainfo", "ginfo", "infogacha"],
  description: "Muestra tu información y cooldowns de gacha.",
  run: async ({ sock, msg, id }) => {
    const owned = gacha.getUserCharacters(id);
    const totalValue = owned.reduce((sum, c) => sum + c.value, 0);

    return kit.reply(
      sock,
      msg,
      `*❀ Usuario \`<${gacha.displayName(id)}>\`*\n\n` +
        `ⴵ RollWaifu » *${status(gacha.checkRollCooldown(id))}*\n` +
        `ⴵ Claim » *${status(gacha.checkClaimCooldown(id))}*\n` +
        `ⴵ Vote » *${status(gacha.checkVoteCooldown(id))}*\n\n` +
        `♡ Personajes reclamados » *${owned.length}*\n` +
        `✰ Valor total » *${eco.money(totalValue)}*\n` +
        `❏ Personajes totales » *${gacha.countCharacters()}*\n` +
        `❏ Series totales » *${gacha.getSeriesList().length}*`
    );
  }
});
