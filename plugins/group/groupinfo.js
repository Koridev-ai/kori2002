"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const db = require("../../libs/groupdb");
const nsfw = require("../../libs/nsfwkit");

const state = (value) => (value ? "✓ Activado" : "✘ Desactivado");

module.exports = gk.define({
  commands: ["gp", "groupinfo"],
  description: "Ver la información del grupo.",
  run: async ({ sock, msg, g }) => {
    const chat = db.chat(g.chatId);
    const owner = g.meta?.owner || g.meta?.ownerPn || "";
    const admins = g.participants.filter((p) => gk.isAdminP(p)).length;
    const registered = Object.keys(chat.users).length;
    let text = `*「✿」Grupo ◢ ${g.meta?.subject || "Grupo"} ◤*\n\n`;
    text += `➪ *Creador ›* ${owner ? gk.mention(owner) : "Desconocido"}\n`;
    text += `♤ Admins › *${admins}*\n`;
    text += `❒ Usuarios › *${g.participants.length}*\n`;
    text += `ꕥ Registrados › *${registered}*\n\n`;
    text += "➪ *Configuraciones:*\n";
    text += `✐ ${sock.user?.name || "Bot"} › *${state(!chat.disabled)}*\n`;
    text += `✐ AntiLinks › *${state(chat.antilinks)}*\n`;
    text += `✐ Bienvenida › *${state(chat.welcome)}*\n`;
    text += `✐ Despedida › *${state(chat.goodbye)}*\n`;
    text += `✐ Alertas › *${state(chat.alerts)}*\n`;
    text += `✐ Nsfw › *${state(nsfw.isEnabled(g.chatId))}*\n`;
    text += `✐ ModoAdmin › *${state(chat.adminonly)}*`;
    return kit.reply(sock, msg, text.trim(), { mentions: owner ? [owner] : [] });
  }
});
