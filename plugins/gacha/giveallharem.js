"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const flow = require("../../libs/gachaflow");

module.exports = gacha.define({
  commands: ["giveallharem"],
  description: "Regala todos tus personajes reclamados a otro usuario.",
  run: async ({ sock, msg, chatId, id, usedPrefix }) => {
    const t = gacha.target(msg);
    if (!t) return kit.reply(sock, msg, "❀ Debes mencionar a quien quieras regalarle tus personajes.");
    if (t.id === id) return kit.reply(sock, msg, "ꕥ No puedes regalarte personajes a ti mismo.");

    if (flow.getGiveaway(chatId, id)) {
      return kit.reply(sock, msg, "《✧》 Ya tienes una donación en curso. Espera a que se complete o expire.");
    }

    const owned = gacha.getUserCharacters(id);
    if (!owned.length) return kit.reply(sock, msg, "ꕥ No tienes personajes para regalar.");

    const totalValue = owned.reduce((sum, c) => sum + c.value, 0);

    await sock.sendMessage(
      chatId,
      {
        text:
          `「✿」 *${gacha.displayName(id)}*, ¿confirmas regalar todo tu harem a *${gacha.displayName(t.id)}*?\n\n` +
          `❏ Personajes a transferir » *${owned.length}*\n` +
          `❏ Valor total » *${eco.money(totalValue)}*\n\n` +
          `✐ Para confirmar usa *${usedPrefix}aceptar*.\n> Esta acción no se puede deshacer.`,
        mentions: [t.jid]
      },
      { quoted: msg }
    );

    flow.addGiveaway({
      chatId,
      from: id,
      to: t.id,
      toJid: t.jid,
      characterIds: owned.map((c) => c.id),
      count: owned.length,
      totalValue
    });
  }
});
