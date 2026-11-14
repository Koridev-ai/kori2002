"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");
const main = require("../../libs/mainkit");

const COOLDOWN_MS = 12 * 60 * 60 * 1000;

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "suggest";

  try {
    const isReport = ["report", "reporte"].includes(command);
    const field = isReport ? "reportCooldown" : "sugCooldown";
    const jid = pdb.selfJid(msg);
    const user = pdb.get(jid);

    const remaining = (user[field] || 0) - Date.now();
    if (remaining > 0) {
      return kit.reply(sock, msg, `ꕥ Espera *${main.msToTime(remaining)}* para volver a ${isReport ? "reportar" : "sugerir"}.`);
    }

    const text = (ctx.args || []).join(" ").trim();
    if (!text) return kit.reply(sock, msg, `《✧》 Debes *escribir* ${isReport ? "el *reporte*" : "la *sugerencia*"}.`);
    if (text.length < 10) {
      return kit.reply(sock, msg, `《✧》 Tu mensaje es *demasiado corto*. Explica mejor tu ${isReport ? "reporte" : "sugerencia"} (mínimo 10 caracteres)`);
    }

    const date = new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const title = isReport ? "Reporte" : "Sugerencia";
    const number = pdb.key(jid);

    const body = `✦ \`${title}\`

❖ *Nombre*
> ${user.name || msg.pushName || "Usuario desconocido"}

❖ *Número*
> wa.me/${number}

❖ *Fecha*
> ${date}

❖ *Mensaje*
> ${text}
`;

    const delivered = await main.notifyOwners(sock, body);
    if (!delivered) return kit.reply(sock, msg, "《✧》 No se pudo enviar tu mensaje, intenta más tarde.");

    pdb.set(jid, field, Date.now() + COOLDOWN_MS);
    return kit.reply(
      sock,
      msg,
      `《✧》 Gracias por tu *${isReport ? "reporte" : "sugerencia"}*\n\n> Tu mensaje fue enviado correctamente a los moderadores`
    );
  } catch (e) {
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["report", "reporte", "sug", "suggest"];
handler.description = "Enviar una sugerencia a los moderadores.";
handler.category = "General";
module.exports = handler;
