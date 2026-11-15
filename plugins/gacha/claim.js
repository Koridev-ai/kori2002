"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

module.exports = gacha.define({
  commands: ["claim", "c", "reclamar"],
  description: "Reclama el personaje de un roll citado.",
  run: async ({ sock, msg, chatId, id, jid }) => {
    const now = Date.now();

    const cooldown = gacha.checkClaimCooldown(id);
    if (!cooldown.ready) return kit.reply(sock, msg, `ꕥ Debes esperar *${eco.formatTime(cooldown.remainingMs)}* para volver a reclamar.`);

    const quoted = kit.getQuoted(msg);
    const roll = quoted && quoted.id ? gacha.getRoll(quoted.id) : null;
    if (!roll || roll.chatId !== chatId) return kit.reply(sock, msg, "❀ Debes citar un personaje válido para reclamar.");

    const character = gacha.getCharacterById(roll.characterId);
    if (!character) return kit.reply(sock, msg, "ꕥ Personaje no encontrado en el catálogo.");

    const alreadyClaimed = (ownerId) =>
      sock.sendMessage(
        chatId,
        {
          text: `ꕥ El personaje *${character.name}* \`${character.id}\` ya ha sido reclamado por *${gacha.displayName(ownerId)}*`,
          mentions: [gacha.mentionJid(ownerId)]
        },
        { quoted: msg }
      );

    const currentOwner = gacha.getOwner(character.id);
    if (currentOwner) return alreadyClaimed(currentOwner);

    if (now < roll.reservedUntil && id !== roll.rolledBy) {
      const left = ((roll.reservedUntil - now) / 1000).toFixed(1);
      return kit.reply(sock, msg, `ꕥ Este personaje está protegido durante *${left}s*, solo quien lo tiró puede reclamarlo.`);
    }

    if (now > roll.expiresAt) {
      const expired = ((now - roll.expiresAt) / 1000).toFixed(1);
      return kit.reply(sock, msg, `ꕥ El personaje ha expirado » ${expired}s.`);
    }

    if (!gacha.claimCharacter(character.id, id, now)) {
      const winner = gacha.getOwner(character.id);
      return winner ? alreadyClaimed(winner) : kit.reply(sock, msg, "ꕥ No se pudo reclamar el personaje, intenta de nuevo.");
    }

    gacha.setClaimCooldown(id, now);
    kit.react(sock, msg, "🌸");

    const name = gacha.displayName(id);
    const duration = ((now - roll.createdAt) / 1000).toFixed(1);
    const template = gacha.getClaimMessage(id);
    const caption = template
      ? gacha.renderClaimMessage(template, { user: name, character: character.name })
      : `❀ *${character.name}* ha sido reclamado por *${name}*\n` +
        `✦ ID » \`${character.id}\`\n` +
        `✰ Valor » *${eco.money(character.value)}*\n` +
        `⏱ Tiempo » *${duration}s*`;

    return sock.sendMessage(chatId, { text: caption, mentions: [jid] }, { quoted: msg });
  }
});
