"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const flow = require("../../libs/gachaflow");

const MAX_LIST = 30;

function renderCharacterList(list) {
  const sorted = [...list].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
  const lines = sorted.slice(0, MAX_LIST).map((c) => `• ${c.name} (${c.series}) — ${c.value}`);
  if (sorted.length > MAX_LIST) lines.push(`…y ${sorted.length - MAX_LIST} más`);
  return lines.join("\n");
}

module.exports = gacha.define({
  commands: ["haremreq", "solicitudesharem", "haremrequests"],
  description: "Lista las solicitudes de recuperación de harem pendientes o muestra el detalle de una.",
  owner: true,
  run: async ({ sock, msg, args, usedPrefix }) => {
    const reqId = flow.parseId(args[0]);

    if (reqId === null) {
      const rows = gacha.getPendingHaremRequests(MAX_LIST);
      if (!rows.length) return kit.reply(sock, msg, "✐ No hay solicitudes de harem pendientes.");
      const lines = rows.map((r) => {
        const count = gacha.collectHarem(flow.unique([...(r.oldIds || []), flow.idOf(r.oldJid)])).length;
        return `*#${r.id}* · ${gacha.displayName(r.newId)} ← ${flow.idOf(r.oldJid)} · ${count} personajes · ${flow.fmtDate(r.createdAt)}`;
      });
      return kit.reply(
        sock,
        msg,
        `「✿」 *Solicitudes de harem pendientes* (${rows.length})\n\n${lines.join("\n")}\n\n` +
          `> Detalle: ${usedPrefix}haremreq <id>\n> Aprobar: ${usedPrefix}aprobarharem <id>`
      );
    }

    const req = gacha.getHaremRequest(reqId);
    if (!req) return kit.reply(sock, msg, `ꕥ No existe la solicitud *#${reqId}*.`);

    const oldIds = flow.unique([...(req.oldIds || []), ...(await flow.accountIds(sock, msg, req.oldJid))]);
    const harem = gacha.collectHarem(oldIds);
    const estado = req.status === "pending" ? "pendiente" : req.status === "approved" ? "aprobada" : "rechazada";

    let text =
      `「✿」 *Solicitud #${req.id}* (${estado})\n\n` +
      `❏ Cuenta nueva » *${gacha.displayName(req.newId)}* (${req.newId})\n` +
      `❏ Cuenta anterior » *${flow.idOf(req.oldJid)}*\n` +
      `❏ Creada » ${flow.fmtDate(req.createdAt)}\n`;

    if (req.status === "pending") {
      text += `❏ Personajes actuales » *${harem.length}* (valor ${eco.money(flow.sumValue(harem))})\n\n`;
      text += harem.length ? `${renderCharacterList(harem)}\n\n` : "";
      text += `✐ Aprobar: *${usedPrefix}aprobarharem ${req.id}*\n✐ Rechazar: *${usedPrefix}rechazarharem ${req.id}*`;
    } else {
      text += `❏ Resuelta » ${req.resolvedAt ? flow.fmtDate(req.resolvedAt) : "—"}\n`;
      if (req.movedCount !== null) text += `❏ Personajes movidos » *${req.movedCount}*\n`;
      if (req.note) text += `❏ Motivo » ${req.note}\n`;
    }

    return kit.reply(sock, msg, text.trimEnd());
  }
});
