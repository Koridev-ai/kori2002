"use strict";

const botmedia = require("../../libs/botmedia");
const sockkit = require("../../libs/sockkit");

module.exports = sockkit.define({
  commands: ["setpfp", "setimage"],
  description: "Cambiar la foto de perfil del bot.",
  run: async ({ sock, msg, args, botId, usedPrefix, command, reply }) => {
    const buffer = await botmedia.acquire(msg, args);
    if (!buffer) return reply(`✐ Envía o responde a una imagen, o indica un enlace directo.\n> Ejemplo: *${usedPrefix}${command} https://sitio.com/foto.jpg*`);
    botmedia.save(botId, "pfp", buffer);
    await sock.updateProfilePicture(`${botId}@s.whatsapp.net`, buffer);
    return reply("✿ Foto de perfil actualizada.");
  }
});
