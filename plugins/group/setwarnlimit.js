"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const db = require("../../libs/groupdb");

module.exports = gk.define({
  commands: ["setwarnlimit"],
  description: "Establecer el límite de advertencias del grupo.",
  admin: true,
  run: async ({ sock, msg, g, args, usedPrefix, command }) => {
    const chat = db.chat(g.chatId);
    const limit = parseInt(args[0], 10);
    if (isNaN(limit) || limit < 0 || limit > 10) {
      return kit.reply(
        sock,
        msg,
        `✐ El límite de advertencias debe ser un número entre \`1\` y \`10\`, o \`0\` para desactivar.\n> Ejemplo 1 › *${usedPrefix + command} 5*\n> Ejemplo 2 › *${usedPrefix + command} 0*\n\n> Si usas \`0\`, se desactivará la función de eliminar usuarios al alcanzar el límite de advertencias.\n❖ Estado actual: ${chat.expulsar ? `\`${chat.warnLimit}\` advertencias` : "`Desactivado`"}`
      );
    }
    if (limit === 0) {
      db.set(g.chatId, "expulsar", false);
      return kit.reply(sock, msg, "✐ Has desactivado la función de eliminar usuarios al alcanzar el límite de advertencias.");
    }
    db.set(g.chatId, "warnLimit", limit);
    db.set(g.chatId, "expulsar", true);
    return kit.reply(sock, msg, `✐ Límite de advertencias establecido en \`${limit}\` para este grupo.\n> ❖ Los usuarios serán eliminados automáticamente al alcanzar este límite.`);
  }
});
