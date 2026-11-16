"use strict";

const sockkit = require("../../libs/sockkit");

module.exports = sockkit.define({
  commands: ["setstatus"],
  description: "Cambiar la descripción de perfil del bot.",
  run: async ({ sock, text, usedPrefix, command, reply }) => {
    if (!text) return reply(`✐ Indica la nueva descripción.\n> Ejemplo: *${usedPrefix}${command} Hola, soy un bot*`);
    if (text.length > 139) return reply("✐ La descripción no puede superar los *139* caracteres.");
    await sock.updateProfileStatus(text);
    return reply("✿ Descripción de perfil actualizada.");
  }
});
