"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const flow = require("../../libs/gachaflow");

async function acceptTrade({ sock, msg, trade }) {
  if (gacha.getOwner(trade.giveId) !== trade.from || gacha.getOwner(trade.getId) !== trade.to) {
    flow.removeTrade(trade);
    return kit.reply(sock, msg, "⚠︎ Uno de los personajes ya no está disponible para el intercambio.");
  }

  const now = Date.now();
  gacha.transferCharacter(trade.giveId, trade.to, now);
  gacha.transferCharacter(trade.getId, trade.from, now);
  flow.removeTrade(trade);

  const nameFrom = gacha.displayName(trade.from);
  const nameTo = gacha.displayName(trade.to);
  return sock.sendMessage(
    trade.chatId,
    {
      text: `「✿」 Intercambio aceptado!\n\n✦ *${nameTo}* » ${trade.giveName}\n✦ *${nameFrom}* » ${trade.getName}`,
      mentions: [gacha.mentionJid(trade.from), gacha.mentionJid(trade.to)]
    },
    { quoted: msg }
  );
}

async function acceptGiveaway({ sock, msg, giveaway }) {
  flow.removeGiveaway(giveaway);

  const now = Date.now();
  let count = 0;
  let totalValue = 0;
  gacha.touchUser(giveaway.to, giveaway.toJid);
  for (const characterId of giveaway.characterIds) {
    if (gacha.getOwner(characterId) !== giveaway.from) continue;
    const character = gacha.getCharacterById(characterId);
    gacha.transferCharacter(characterId, giveaway.to, now);
    count++;
    totalValue += character ? character.value : 0;
  }

  if (!count) return kit.reply(sock, msg, "ꕥ Ya no tienes personajes para regalar.");

  return sock.sendMessage(
    giveaway.chatId,
    {
      text:
        `「✿」 Has regalado con éxito todos tus personajes a *${gacha.displayName(giveaway.to)}*!\n\n` +
        `> ❏ Personajes regalados » *${count}*\n` +
        `> ✰ Valor total » *${eco.money(totalValue)}*`,
      mentions: [giveaway.toJid]
    },
    { quoted: msg }
  );
}

module.exports = gacha.define({
  commands: ["aceptar", "accept"],
  description: "Acepta un intercambio o una donación de harem pendiente.",
  run: async ({ sock, msg, chatId, id }) => {
    const trade = flow.findTradeByChat(chatId);
    if (trade && trade.to === id) return acceptTrade({ sock, msg, trade });

    const giveaway = flow.getGiveaway(chatId, id);
    if (giveaway) return acceptGiveaway({ sock, msg, giveaway });

    return kit.reply(sock, msg, "ꕥ No tienes ninguna solicitud pendiente para aceptar.");
  }
});
