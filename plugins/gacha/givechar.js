"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");

module.exports = gacha.define({
  commands: ["givechar", "givewaifu", "regalar"],
  description: "Regala un personaje reclamado a otro usuario.",
  run: async ({ sock, msg, chatId, id, args, usedPrefix, command }) => {
    if (!args.length) return kit.reply(sock, msg, "❀ Debes escribir el nombre del personaje y citar o mencionar al usuario que lo recibirá.");

    const t = gacha.target(msg);
    if (!t) return kit.reply(sock, msg, "❀ Debes mencionar o citar el mensaje del destinatario.");
    if (t.id === id) return kit.reply(sock, msg, "ꕥ No puedes regalarte un personaje a ti mismo.");

    const query = args.filter((a) => !a.startsWith("@")).join(" ");
    if (!query) return kit.reply(sock, msg, "❀ Debes escribir el nombre del personaje que quieres regalar.");

    const { matches } = gacha.findOwned(id, query);
    if (!matches.length) return kit.reply(sock, msg, `ꕥ *${query}* no está reclamado por ti.`);
    if (matches.length > 1) return kit.reply(sock, msg, gacha.ambiguousText(matches, query, usedPrefix, command));

    const character = matches[0];
    gacha.touchUser(t.id, t.jid);
    gacha.transferCharacter(character.id, t.id, Date.now());

    return sock.sendMessage(
      chatId,
      { text: `❀ *${character.name}* ha sido regalado a *${gacha.displayName(t.id)}* por *${gacha.displayName(id)}*.`, mentions: [t.jid] },
      { quoted: msg }
    );
  }
});
