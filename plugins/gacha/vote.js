"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

module.exports = gacha.define({
  commands: ["vote", "votar"],
  description: "Vota por un personaje para subir su valor.",
  run: async ({ sock, msg, id, text, usedPrefix, command }) => {
    const cooldown = gacha.checkVoteCooldown(id);
    if (!cooldown.ready) return kit.reply(sock, msg, `ꕥ Debes esperar *${eco.formatTime(cooldown.remainingMs)}* para volver a votar.`);

    if (!text) return kit.reply(sock, msg, `❀ Debes especificar un personaje para votarlo.\n> Ejemplo » *${usedPrefix}${command} Rem*`);

    const character = gacha.findCharacterExact(text);
    if (!character) return kit.reply(sock, msg, "ꕥ Personaje no encontrado. Asegúrate de que el nombre esté correcto.");

    const charCooldown = gacha.checkCharacterVoteCooldown(character.id);
    if (!charCooldown.ready) {
      return kit.reply(sock, msg, `ꕥ *${character.name}* ha sido votada recientemente.\n> Debes esperar *${eco.formatTime(charCooldown.remainingMs)}* para votarla de nuevo.`);
    }

    const result = gacha.voteForCharacter(character.id, id, Date.now());
    if (!result) return kit.reply(sock, msg, `ꕥ El personaje *${character.name}* ya alcanzó el valor máximo por hoy.`);

    return kit.reply(sock, msg, `❀ Votaste por *${character.name}* (*${character.series}*)\n> Su nuevo valor es *${eco.money(result.newValue)}*`);
  }
});
