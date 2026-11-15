"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const db = require("../../libs/groupdb");

module.exports = gk.define({
  commands: ["setgoodbye"],
  description: "Establecer un mensaje de despedida personalizado.",
  admin: true,
  run: async ({ sock, msg, g, args, text, usedPrefix, command }) => {
    const chat = db.chat(g.chatId);
    if (!args.length) {
      return kit.reply(
        sock,
        msg,
        `ꕤ Set Bye\n\n*❒ Variables disponibles:*\n✤ @user\n> → Mención del usuario que sale\n\n✤ @group\n> → Nombre del grupo\n\n✤ @desc\n> → Descripción del grupo\n\n✤ @members\n> → Número de miembros actuales\n\n✤ @time\n> → Fecha y hora\n\n✿ Si ya tienes un mensaje configurado y quieres borrarlo usa: *${usedPrefix + command} clear*`
      );
    }
    if (args[0].toLowerCase() === "clear") {
      if (!chat.sGoodbye) return kit.reply(sock, msg, "✎ No tienes ningún mensaje de despedida definido.");
      db.set(g.chatId, "sGoodbye", "");
      return kit.reply(sock, msg, "✐ Mensaje de despedida eliminado.");
    }
    db.set(g.chatId, "sGoodbye", text);
    return kit.reply(sock, msg, "ꕥ Has establecido el mensaje de despedida correctamente.");
  }
});
