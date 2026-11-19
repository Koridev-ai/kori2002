"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const harembg = require("../../libs/harembg");

module.exports = gacha.define({
  commands: ["delharembg", "delfondoharem"],
  description: "Quita el fondo personalizado de tu harem.",
  run: async ({ sock, msg, id }) => {
    if (!harembg.remove(id)) return kit.reply(sock, msg, "ꕥ No tienes un fondo personalizado en tu harem.");
    return kit.reply(sock, msg, "❀ Fondo de tu harem eliminado.");
  }
});
