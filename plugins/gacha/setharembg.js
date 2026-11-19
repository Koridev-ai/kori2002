"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const harembg = require("../../libs/harembg");

module.exports = gacha.define({
  commands: ["setharembg", "setfondoharem", "harembg"],
  description: "Pone una imagen de fondo en tu harem.",
  run: async ({ sock, msg, id, usedPrefix, command }) => {
    const media = kit.getMedia(kit.getSource(msg));
    if (!harembg.isImage(media)) {
      return kit.reply(sock, msg, `❀ Envía o responde a una *imagen* para usarla como fondo de tu harem.\n> Ejemplo » *${usedPrefix}${command}* (respondiendo a una imagen)`);
    }

    const buffer = await kit.downloadMedia(media);
    if (!buffer || !buffer.length) return kit.reply(sock, msg, "ꕥ No se pudo descargar la imagen.");
    if (buffer.length > harembg.MAX_BYTES) return kit.reply(sock, msg, "ꕥ La imagen es demasiado pesada, el máximo es *12 MB*.");

    try {
      await harembg.save(id, buffer);
    } catch (error) {
      console.error("[harembg] no se pudo guardar:", error);
      return kit.reply(sock, msg, "ꕥ No se pudo procesar esa imagen. Prueba con otra en formato JPG, PNG o WEBP.");
    }
    return kit.reply(sock, msg, `❀ Fondo de tu harem actualizado. Míralo con *${usedPrefix}harem*`);
  }
});
