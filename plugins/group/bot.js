"use strict";

const gk = require("../../libs/groupkit");
const db = require("../../libs/groupdb");

module.exports = gk.define({
  commands: ["bot"],
  description: "Activar o desactivar el bot en el grupo.",
  admin: true,
  run: async ({ sock, msg, g, args, usedPrefix }) => {
    const name = sock.user?.name || "Bot";
    const chat = db.chat(g.chatId);
    const option = (args[0] || "").toLowerCase();
    if (option === "off") {
      if (chat.disabled) return sock.sendMessage(g.chatId, { text: "《✧》 El *Bot* ya estaba *desactivado* en este grupo." }, { quoted: msg });
      db.set(g.chatId, "disabled", true);
      return sock.sendMessage(g.chatId, { text: `《✧》 Has *desactivado* a *${name}* en este grupo.` }, { quoted: msg });
    }
    if (option === "on") {
      if (!chat.disabled) return sock.sendMessage(g.chatId, { text: `《✧》 *${name}* ya estaba *activado* en este grupo.` }, { quoted: msg });
      db.set(g.chatId, "disabled", false);
      return sock.sendMessage(g.chatId, { text: `《✧》 Has *activado* a *${name}* en este grupo.` }, { quoted: msg });
    }
    return sock.sendMessage(
      g.chatId,
      { text: `*✿ Estado de ${name} (｡•́‿•̀｡)*\n✐ *Actual ›* ${chat.disabled ? "✗ Desactivado" : "✓ Activado"}\n\n✎ Puedes cambiarlo con:\n> ● _Activar ›_ *${usedPrefix}bot on*\n> ● _Desactivar ›_ *${usedPrefix}bot off*` },
      { quoted: msg }
    );
  }
});
