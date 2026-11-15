"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");

module.exports = gacha.define({
  commands: ["setclaimmsg", "setclaim"],
  description: "Modifica el mensaje que se envía al reclamar un personaje.",
  run: async ({ sock, msg, id, text, usedPrefix, command }) => {
    if (!text) {
      return kit.reply(
        sock,
        msg,
        `❀ Debes especificar un mensaje para reclamar un personaje.\n> Ejemplos:\n> ${usedPrefix}${command} €user ha reclamado el personaje €character!\n> ${usedPrefix}${command} €character ha sido reclamado por €user`
      );
    }
    if (!text.includes("€user") || !text.includes("€character")) return kit.reply(sock, msg, "ꕥ Tu mensaje debe incluir *€user* y *€character* para que funcione correctamente.");

    gacha.setClaimMessage(id, text);
    return kit.reply(sock, msg, "❀ Mensaje de reclamación modificado.");
  }
});
