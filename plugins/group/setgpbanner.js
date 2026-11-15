"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");

module.exports = gk.define({
  commands: ["setgpbanner"],
  description: "Cambiar la imagen del grupo.",
  admin: true,
  botAdmin: true,
  run: async ({ sock, msg, g }) => {
    const media = kit.getMedia(kit.getSource(msg));
    if (!media || media.type !== "image") return kit.reply(sock, msg, "《✧》 Te faltó la imagen para cambiar el perfil del grupo.");
    const buffer = await kit.downloadMedia(media);
    if (!buffer?.length) return kit.reply(sock, msg, "《✧》 No se pudo descargar la imagen.");
    await sock.updateProfilePicture(g.chatId, buffer);
    return kit.reply(sock, msg, "✿ La imagen del grupo se actualizó con éxito.");
  }
});
