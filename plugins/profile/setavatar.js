"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");
const avatar = require("../../libs/avatardb");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "setavatar";

  try {
    const media = kit.getMedia(kit.getSource(msg));
    const info = avatar.describe(media);

    if (info?.error) return kit.reply(sock, msg, `《✧》 ${info.error}`);
    if (!info) {
      return kit.reply(sock, msg, `《✧》 Envía o responde a una *imagen*, *gif* o *video corto* para usarlo como imagen de tu perfil.\n\n> ✐ Ejemplo » *${usedPrefix + command}* (respondiendo a una imagen o gif)`);
    }

    const buffer = await kit.downloadMedia(media);
    if (!buffer?.length) return kit.reply(sock, msg, "《✧》 No se pudo descargar el archivo.");
    if (buffer.length > avatar.MAX_BYTES) return kit.reply(sock, msg, "《✧》 El archivo es demasiado pesado, el máximo es *12 MB*.");

    avatar.save(pdb.selfJid(msg), buffer, info);
    return kit.reply(sock, msg, `✎ Tu imagen de perfil se actualizó, puedes verla con ${usedPrefix}profile ฅ^•ﻌ•^ฅ`);
  } catch (e) {
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["setavatar", "setfoto"];
handler.description = "Establecer una imagen o gif para tu perfil.";
handler.category = "Perfil";
module.exports = handler;
