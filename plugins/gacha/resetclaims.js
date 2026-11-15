"use strict";

const path = require("path");
const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");

const CONFIRM_TTL_MS = 60000;

const pending = new Map();

module.exports = gacha.define({
  commands: ["resetclaims", "resetgacha", "borrarclaims"],
  description: "Borra todos los personajes reclamados de todos los usuarios para empezar desde cero.",
  owner: true,
  run: async ({ sock, msg, id, args, usedPrefix, command }) => {
    const now = Date.now();
    const askedAt = pending.get(id);
    const confirming = String(args[0] || "").toLowerCase() === "confirmar";

    if (!confirming || !askedAt || now - askedAt > CONFIRM_TTL_MS) {
      pending.set(id, now);
      return kit.reply(
        sock,
        msg,
        `⚠️ *Reinicio total del gacha*\n` +
          `Se borrarán *${gacha.getClaimedCount()}* personajes reclamados de todos los usuarios, el mercado, los favoritos y los cooldowns.\n` +
          `El catálogo, los votos y el historial de tiradas se conservan. Se hará un respaldo de la base de datos antes.\n\n` +
          `Para continuar escribe *${usedPrefix}${command} confirmar* en los próximos 60 segundos.`
      );
    }

    pending.delete(id);

    let backupFile;
    try {
      backupFile = gacha.createBackup();
    } catch (error) {
      console.error(error);
      return kit.reply(sock, msg, "❌ No pude crear el respaldo de la base de datos, así que cancelé el reinicio. No se borró nada.");
    }

    const summary = gacha.resetAllClaims();
    return kit.reply(
      sock,
      msg,
      `🧹 *Gacha reiniciado*\n` +
        `✿ Personajes liberados › *${summary.claims}*\n` +
        `✐ Ventas canceladas › *${summary.sales}*\n` +
        `✅ Respaldo creado › *${path.basename(backupFile)}*`
    );
  }
});
