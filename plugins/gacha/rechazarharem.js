"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const flow = require("../../libs/gachaflow");

module.exports = gacha.define({
  commands: ["rechazarharem", "denyharem", "rejectharem"],
  description: "Rechaza una solicitud de recuperación de harem.",
  owner: true,
  run: async ({ sock, msg, id, args, usedPrefix }) => {
    const reqId = flow.parseId(args[0]);
    if (reqId === null) return kit.reply(sock, msg, `❀ Uso: *${usedPrefix}rechazarharem <id> [motivo]*`);

    const request = gacha.getHaremRequest(reqId);
    if (!request) return kit.reply(sock, msg, `ꕥ No existe la solicitud *#${reqId}*.`);
    if (request.status !== "pending") {
      return kit.reply(sock, msg, `ꕥ La solicitud *#${reqId}* ya fue ${request.status === "approved" ? "aprobada" : "rechazada"}.`);
    }

    const reason = args.slice(1).join(" ").trim() || null;
    gacha.resolveHaremRequest(reqId, "rejected", { resolvedBy: id, note: reason });
    await kit.reply(sock, msg, `✅ Solicitud *#${reqId}* rechazada.`);

    try {
      await sock.sendMessage(request.chatId, {
        text: `「✿」 *${gacha.displayName(request.newId)}*, tu solicitud de harem *#${reqId}* fue *rechazada*.` + (reason ? `\n\n> Motivo » ${reason}` : ""),
        mentions: [gacha.mentionJid(request.newId)]
      });
    } catch (error) {
      console.error("No pude avisar al usuario del rechazo:", error.message);
    }
  }
});
