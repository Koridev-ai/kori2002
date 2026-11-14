"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const db = require("../../libs/groupdb");

async function removeMany(sock, g, msg, list) {
  let removed = 0;
  const errors = [];
  for (const p of list) {
    try {
      await sock.groupParticipantsUpdate(g.chatId, [p.id], "remove");
      removed++;
      await gk.sleep(3000);
    } catch (e) {
      errors.push(`${gk.mention(p.id)}: ${e.message}`);
    }
  }
  return { removed, errors };
}

function summary(result, skipped) {
  let text = `《✧》 Proceso completado.\n> Usuarios eliminados: *${result.removed}*`;
  if (skipped > 0) text += `\n> Usuarios omitidos (admins/owners): *${skipped}*`;
  if (result.errors.length) text += `\n> Errores: *${result.errors.length}*\n${result.errors.join("\n")}`;
  return text;
}

module.exports = gk.define({
  commands: ["kick", "ban", "bang"],
  description: "Expulsar a un usuario del grupo.",
  admin: true,
  botAdmin: true,
  run: async ({ sock, msg, g, args, usedPrefix, command }) => {
    const mode = (args[0] || "").toLowerCase();
    const members = g.participants.filter((p) => !(g.bot && p.id === g.bot.id));

    if (mode === "num" || mode === "listnum") {
      if (!args[1]) return kit.reply(sock, msg, `《✧》 Ingrese algún prefijo de un país\n> ✎ Ejemplo: *${usedPrefix + command} num +54*`);
      const prefix = args[1].replace(/[+]/g, "");
      const matches = members.filter((p) => gk.mention(p.id).slice(1).startsWith(prefix));
      if (!matches.length) return kit.reply(sock, msg, `《✧》 Aquí no hay ningún número con el prefijo +${prefix}`);
      if (mode === "listnum") {
        const lines = matches.map((p) => `⭔ ${gk.mention(p.id)}`);
        return kit.reply(sock, msg, `《✧》 *Lista de usuarios con prefijo +${prefix}* (${matches.length})\n\n${lines.join("\n")}`, { mentions: matches.map((p) => p.id) });
      }
      const targets = matches.filter((p) => !gk.isProtected(p, g, { admins: true }));
      if (!targets.length) return kit.reply(sock, msg, `《✧》 Hay usuarios con prefijo +${prefix} pero todos son admins o propietarios.`);
      await kit.reply(sock, msg, `《✧》 *Eliminando usuarios con prefijo +${prefix}* (${targets.length} de ${matches.length})\n> El proceso tomará unos segundos...`);
      const result = await removeMany(sock, g, msg, targets);
      return kit.reply(sock, msg, summary(result, matches.length - targets.length));
    }

    if (mode === "all") {
      const targets = members.filter((p) => !gk.isProtected(p, g, { admins: true }));
      if (!targets.length) return kit.reply(sock, msg, "《✧》 No hay usuarios para eliminar (todos son admins o propietarios).");
      await kit.reply(sock, msg, `《✧》 *Eliminando todos los usuarios* (${targets.length})\n> El proceso tomará unos segundos...`);
      const result = await removeMany(sock, g, msg, targets);
      return kit.reply(sock, msg, summary(result, members.length - targets.length));
    }

    if (mode === "inactive" || mode === "listinactive") {
      const days = 30;
      const tracked = db.trackedDays(g.chatId);
      if (tracked < days) {
        return kit.reply(sock, msg, `《✧》 El bot lleva *${Math.floor(tracked)}* días registrando actividad en este grupo. Se necesitan al menos *${days}* para detectar inactivos con seguridad.`);
      }
      const idle = members.filter((p) => {
        if (gk.isProtected(p, g, { admins: true })) return false;
        return db.periodStats(db.peekUser(g.chatId, p.id), days).msgs === 0;
      });
      if (!idle.length) return kit.reply(sock, msg, "《✧》 Este grupo es activo, no tiene inactivos.");
      if (mode === "listinactive") {
        return kit.reply(sock, msg, `《✧》 *Lista de inactivos* (${idle.length})\n\n${idle.map((p) => `⭔ ${gk.mention(p.id)}`).join("\n")}`, { mentions: idle.map((p) => p.id) });
      }
      await kit.reply(sock, msg, `《✧》 *Eliminando inactivos* (${idle.length})\n> El proceso tomará unos segundos...`);
      const result = await removeMany(sock, g, msg, idle);
      return kit.reply(sock, msg, summary(result, 0));
    }

    const t = gk.target(msg, g);
    if (!t) {
      return kit.reply(
        sock,
        msg,
        `《✧》 Por favor, Etiqueta o responde al *mensaje* de la *persona* que quieres eliminar.\n\n✎ *Opciones especiales:*\n> *${usedPrefix + command} num +57* - Eliminar todos los usuarios con prefijo +57\n> *${usedPrefix + command} listnum +56* - Listar usuarios con prefijo +56\n> *${usedPrefix + command} all* - Eliminar todos los usuarios\n> *${usedPrefix + command} inactive* - Eliminar usuarios inactivos últimos (30 días)\n> *${usedPrefix + command} listinactive* - Listar usuarios inactivos`
      );
    }
    if (!t.p) return kit.reply(sock, msg, `《✧》 *@${t.number}* ya no está en el grupo.`, { mentions: [t.jid] });
    if (g.bot && t.p.id === g.bot.id) return kit.reply(sock, msg, "《✧》 No puedo eliminar al *bot* del grupo");
    if (t.p.admin === "superadmin") return kit.reply(sock, msg, "《✧》 No puedo eliminar al *propietario* del grupo");
    if (gk.isProtected(t.p, g)) return kit.reply(sock, msg, "《✧》 No puedo eliminar al *propietario* del bot");
    await sock.groupParticipantsUpdate(g.chatId, [t.p.id], "remove");
    return kit.reply(sock, msg, `✎ @${t.number} *eliminado* correctamente`, { mentions: [t.jid] });
  }
});
