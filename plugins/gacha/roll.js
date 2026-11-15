"use strict";

const gacha = require("../../libs/gachakit");
const yandere = require("../../libs/yandere");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

const locks = new Map();
const LOCK_MS = 15000;
const ATTEMPTS = 3;

module.exports = gacha.define({
  commands: ["roll", "rw", "rollwaifu"],
  description: "Tira un personaje aleatorio del catálogo gacha.",
  run: async ({ sock, msg, chatId, id }) => {
    const now = Date.now();
    for (const [key, lockedAt] of locks) {
      if (now - lockedAt > LOCK_MS) locks.delete(key);
    }
    if (locks.has(id)) return;
    locks.set(id, now);

    try {
      if (gacha.countCharacters() === 0) {
        return kit.reply(sock, msg, "⚠️ Aún no hay personajes en el catálogo. Un owner puede generarlos con *genchar*.");
      }

      const cooldown = gacha.checkRollCooldown(id);
      if (!cooldown.ready) return kit.reply(sock, msg, `⏳ Debes esperar *${eco.formatTime(cooldown.remainingMs)}* para volver a tirar.`);

      kit.react(sock, msg, "🕒");

      let character = null;
      let post = null;
      for (let i = 0; i < ATTEMPTS && !(post && post.url); i++) {
        character = gacha.getRandomCharacter();
        if (!character) break;
        post = await yandere.getRandomPost(character.tag);
      }

      if (!character || !post || !post.url) {
        kit.react(sock, msg, "✖️");
        return kit.reply(sock, msg, "✐ No se encontraron imágenes para el personaje, intenta de nuevo.");
      }

      const owner = gacha.getOwner(character.id);
      const estado = owner ? `Reclamado por ${gacha.displayName(owner)}` : "Libre";

      const caption =
        `➩ ¡Un personaje salvaje apareció!\n\n` +
        `✿ Nombre » *${character.name}*\n` +
        `✦ ID » \`${character.id}\`\n` +
        `⚥ Género » *${character.gender}*\n` +
        `❖ Serie » *${character.series}*\n` +
        `✰ Valor » *${eco.money(character.value)}*\n` +
        `♡ Estado » *${estado}*`;

      const sent = await sock.sendMessage(chatId, { image: { url: post.url }, caption }, { quoted: msg });

      if (sent && sent.key && sent.key.id) {
        gacha.recordRoll({
          messageId: sent.key.id,
          chatId,
          characterId: character.id,
          name: character.name,
          value: character.value,
          rolledBy: id
        });
      }
      gacha.setRollCooldown(id, Date.now());
      kit.react(sock, msg, "🌸");
    } finally {
      locks.delete(id);
    }
  }
});
