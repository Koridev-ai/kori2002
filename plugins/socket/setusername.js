"use strict";

const sockkit = require("../../libs/sockkit");

module.exports = sockkit.define({
  commands: ["setusername"],
  description: "Cambiar el nombre de perfil de WhatsApp del bot.",
  run: async ({ sock, text, usedPrefix, command, reply }) => {
    if (!text) return reply(`✐ Indica el nuevo nombre de perfil.\n> Ejemplo: *${usedPrefix}${command} Mi Bot*`);
    if (text.length > 25) return reply("✐ El nombre de perfil no puede superar los *25* caracteres.");
    await sock.updateProfileName(text);
    return reply(`✿ Nombre de perfil actualizado a *${text}*`);
  }
});
