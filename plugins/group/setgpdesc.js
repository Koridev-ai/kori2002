"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");

module.exports = gk.define({
  commands: ["setgpdesc"],
  description: "Cambiar la descripción del grupo.",
  admin: true,
  botAdmin: true,
  run: async ({ sock, msg, g, text }) => {
    if (!text) return kit.reply(sock, msg, "《✧》 Por favor, ingrese la nueva descripción que desea ponerle al grupo.");
    await sock.groupUpdateDescription(g.chatId, text);
    return kit.reply(sock, msg, "✿ La descripción del grupo se modificó correctamente.");
  }
});
