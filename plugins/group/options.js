"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const db = require("../../libs/groupdb");

const MAP = {
  antilinks: "antilinks",
  antienlaces: "antilinks",
  antilink: "antilinks",
  welcome: "welcome",
  bienvenida: "welcome",
  goodbye: "goodbye",
  despedida: "goodbye",
  alerts: "alerts",
  alertas: "alerts",
  adminonly: "adminonly",
  onlyadmin: "adminonly"
};

const NAMES = {
  antilinks: "el *AntiEnlace*",
  welcome: "el mensaje de *Bienvenida*",
  goodbye: "el mensaje de *Despedida*",
  alerts: "las *Alertas*",
  adminonly: "el modo *Solo Admin*"
};

const TITLES = { antilinks: "AntiEnlace", welcome: "Bienvenida", goodbye: "Despedida", alerts: "Alertas", adminonly: "AdminOnly" };

const INFO = {
  antilinks: "> Si el *antienlace* está activado, el bot eliminará a todos los usuarios que envíen links de otros grupos.",
  welcome: "> Si el mensaje de bienvenida está activado, el bot enviará un mensaje de bienvenida a los nuevos miembros del grupo.",
  goodbye: "> Si el mensaje de despedida está activado, el bot enviará un mensaje de despedida en el momento que un usuario abandone el grupo.",
  alerts: "> Si las alertas están activadas, el bot avisará cuando se realicen cambios de administradores.",
  adminonly: "> Si el modo *Solo Admin* está activado, solo los administradores podrán utilizar los comandos del bot."
};

module.exports = gk.define({
  commands: Object.keys(MAP),
  description: "Configurar opciones del grupo.",
  admin: true,
  run: async ({ sock, msg, g, args, usedPrefix, command }) => {
    const key = MAP[command];
    const state = (args[0] || "").toLowerCase();
    const chat = db.chat(g.chatId);
    const current = chat[key] === true;
    if (!state) {
      return kit.reply(
        sock,
        msg,
        `*✩ ${TITLES[key]} (✿❛◡❛)*\n\nꕥ Un administrador puede activar o desactivar ${NAMES[key]} utilizando:\n\n● _Habilitar ›_ *${usedPrefix + command} enable*\n● _Deshabilitar ›_ *${usedPrefix + command} disable*\n\n❒ *Estado actual ›* ${current ? "✓ Activado" : "✗ Desactivado"}\n${INFO[key]}`
      );
    }
    if (!["on", "off", "enable", "disable"].includes(state)) {
      return kit.reply(sock, msg, `✎ Estado no válido. Usa *on*, *off*, *enable* o *disable*\n\nEjemplo:\n${usedPrefix + command} enable`);
    }
    const enabled = ["on", "enable"].includes(state);
    if (enabled === current) return kit.reply(sock, msg, `✎ *${TITLES[key]}* ya estaba *${enabled ? "activado" : "desactivado"}*.`);
    db.set(g.chatId, key, enabled);
    return kit.reply(sock, msg, `✎ Has *${enabled ? "activado" : "desactivado"}* ${NAMES[key]}.`);
  }
});
