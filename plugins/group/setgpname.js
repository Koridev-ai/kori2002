"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");

module.exports = gk.define({
  commands: ["setgpname"],
  description: "Cambiar el nombre del grupo.",
  admin: true,
  botAdmin: true,
  run: async ({ sock, msg, g, text }) => {
    if (!text) return kit.reply(sock, msg, "《✧》 Por favor, ingrese el nuevo nombre que desea ponerle al grupo.");
    await sock.groupUpdateSubject(g.chatId, text);
    return kit.reply(sock, msg, "✿ El nombre del grupo se modificó correctamente.");
  }
});
