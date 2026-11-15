"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");

module.exports = gacha.define({
  commands: ["delclaimmsg", "delclaim"],
  description: "Restablece el mensaje de reclamo al predeterminado.",
  run: async ({ sock, msg, id }) => {
    if (!gacha.getClaimMessage(id)) return kit.reply(sock, msg, "ꕥ No tienes un mensaje de reclamación personalizado.");
    gacha.deleteClaimMessage(id);
    return kit.reply(sock, msg, "❀ Mensaje de reclamación restablecido.");
  }
});
