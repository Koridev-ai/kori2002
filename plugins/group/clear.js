"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const db = require("../../libs/groupdb");
const pdb = require("../../libs/profiledb");

const LIMIT_DAYS = 30;

const duration = (ms) => {
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return [d ? `${d}d` : "", h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ") || "menos de 1m";
};

module.exports = gk.define({
  commands: ["clear"],
  description: "Limpiar registros de usuarios inactivos del grupo.",
  admin: true,
  run: async ({ sock, msg, g, args, usedPrefix, command }) => {
    const mode = (args[0] || "").toLowerCase();
    const view = ["view", "views"].includes(mode);
    const del = ["delete", "del"].includes(mode);
    const started = Date.now();
    const users = db.chat(g.chatId).users;
    const rows = [];

    for (const [id, u] of Object.entries(users)) {
      if (g.owners.has(id)) continue;
      const last = u.last || 0;
      if (!last) continue;
      const idle = Date.now() - last;
      if (!view && idle <= LIMIT_DAYS * 86400000) continue;
      rows.push({ id, idle, name: pdb.peek(id)?.name || id });
    }

    if (!view && db.trackedDays(g.chatId) < LIMIT_DAYS) {
      return kit.reply(sock, msg, `《✧》 El bot lleva *${Math.floor(db.trackedDays(g.chatId))}* días registrando actividad en este grupo. Se necesitan al menos *${LIMIT_DAYS}* para detectar inactivos.`);
    }
    if (!rows.length) {
      return kit.reply(sock, msg, view ? "ꕥ No hay usuarios con actividad registrada en este grupo." : `ꕥ No se encontraron usuarios inactivos.\n> ⴵ Tiempo limite: ${LIMIT_DAYS} dias`);
    }

    const lines = rows.map((r, i) => `${i + 1}. *${r.name}* - hace ${duration(r.idle)}`);
    const elapsed = Math.max(1, Date.now() - started);
    let title = "ꕥ Usuarios inactivos encontrados:";
    if (view) title = "✰ *Users Info*";
    if (del && !view) title = "✰ *Delete Users Inactivos*";
    let report = [title, `> ❒ Usuarios: ${rows.length}`, `> ⴵ Tiempo límite: ${LIMIT_DAYS} días`, `> ❏ Ejecutado en ${elapsed}ms`, "", ...lines].join("\n");

    if (del && !view) {
      for (const r of rows) db.removeUser(g.chatId, r.id);
      report += "\n\n> ✿ Sus registros fueron eliminados.";
    } else if (!view) {
      report += `\n\n> Para eliminar sus registros usa › *${usedPrefix + command} delete*`;
    }
    return kit.reply(sock, msg, report);
  }
});
