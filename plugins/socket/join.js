"use strict";

const botconf = require("../../libs/botconf");
const sockkit = require("../../libs/sockkit");

const LINK = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;

module.exports = sockkit.define({
  commands: ["join", "unir"],
  description: "Unir el bot a un grupo.",
  run: async ({ sock, args, text, msg, settings, botId, reply }) => {
    const source = args[0] || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || "";
    if (!source && !text) return reply("《✧》 Ingresa el enlace del grupo para unir el bot.");
    const match = String(source || text).match(LINK);
    if (!match) return reply("《✧》 El enlace ingresado no es válido o está incompleto.");

    try {
      await sock.groupAcceptInvite(match[1]);
      return reply(`❀ ${settings.botname || botconf.displayName(botId, sock)} se ha unido exitosamente al grupo.`);
    } catch (error) {
      const detail = String(error?.message || error);
      if (detail.includes("not-authorized") || detail.includes("requires-admin")) {
        return reply("《✧》 La unión requiere aprobación de administrador. Espera a que acepten tu solicitud.");
      }
      if (detail.includes("not-in-group") || detail.includes("removed")) {
        return reply("《✧》 No se pudo unir al grupo porque el bot fue eliminado recientemente.");
      }
      return reply("《✧》 No se pudo unir al grupo, verifica el enlace o los permisos.");
    }
  }
});
