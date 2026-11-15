"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const flow = require("../../libs/gachaflow");

module.exports = gacha.define({
  commands: ["aprobarharem", "approveharem", "transferharem"],
  description: "Aprueba una solicitud y pasa todo el harem de la cuenta anterior a la nueva, o hace una transferencia directa.",
  owner: true,
  run: async ({ sock, msg, id, args, usedPrefix }) => {
    const usage = `❀ Uso: *${usedPrefix}aprobarharem <id>* o *${usedPrefix}aprobarharem <número viejo> <número nuevo>*`;

    let request = null;
    let oldIds;
    let newIds;
    let newId;
    let newJid = null;
    let oldJid;
    let notifyChat;

    if (args.length === 1 && /^#?\d{1,6}$/.test(args[0])) {
      const reqId = flow.parseId(args[0]);
      request = gacha.getHaremRequest(reqId);
      if (!request) return kit.reply(sock, msg, `ꕥ No existe la solicitud *#${reqId}*.`);
      if (request.status !== "pending") {
        return kit.reply(sock, msg, `ꕥ La solicitud *#${request.id}* ya fue ${request.status === "approved" ? "aprobada" : "rechazada"}.`);
      }
      oldJid = request.oldJid;
      oldIds = flow.unique([...(request.oldIds || []), ...(await flow.accountIds(sock, msg, request.oldJid))]);
      newId = request.newId;
      newIds = await flow.accountIds(sock, msg, gacha.mentionJid(newId));
      notifyChat = request.chatId;
    } else if (args.length >= 2) {
      oldJid = flow.parseAccount([args[0]]);
      newJid = flow.parseAccount([args[1]]);
      if (!oldJid || !newJid) return kit.reply(sock, msg, usage);
      oldIds = await flow.accountIds(sock, msg, oldJid);
      newIds = await flow.accountIds(sock, msg, newJid);
      newId = flow.idOf(newJid);
      notifyChat = newJid;
    } else {
      return kit.reply(sock, msg, usage);
    }

    if (newIds.some((a) => oldIds.includes(a)) || oldIds.includes(newId)) {
      return kit.reply(sock, msg, "ꕥ La cuenta vieja y la nueva son la misma; no hay nada que transferir.");
    }

    if (newJid) gacha.touchUser(newId, newJid);

    const result = gacha.moveHarem(oldIds, newId);
    if (!result.moved.length) return kit.reply(sock, msg, "ꕥ La cuenta anterior ya no tiene personajes, no se movió nada.");

    const movedIds = result.moved.map((c) => c.id);
    if (!request) request = gacha.createHaremRequest({ oldJid, oldIds, newId, chatId: notifyChat });
    gacha.resolveHaremRequest(request.id, "approved", { resolvedBy: id, movedCount: movedIds.length, movedIds });

    const newName = gacha.displayName(newId);
    await kit.reply(
      sock,
      msg,
      `✅ *Harem transferido* (#${request.id})\n\n` +
        `❏ Desde » *${flow.idOf(oldJid)}*\n` +
        `❏ Hacia » *${newName}* (${newId})\n` +
        `❏ Personajes » *${result.moved.length}*\n` +
        `❏ Valor total » *${eco.money(result.totalValue)}*` +
        (result.favoriteKept ? "\n❏ Favorito conservado" : "")
    );

    try {
      const mention = gacha.mentionJid(newId);
      await sock.sendMessage(notifyChat, {
        text:
          `「✿」 *${newName}*, tu solicitud de harem fue *aprobada*.\n\n` +
          `> ❏ Personajes recuperados » *${result.moved.length}*\n` +
          `> ✰ Valor total » *${eco.money(result.totalValue)}*\n\n` +
          `Revisa tu harem con *${usedPrefix}harem*.`,
        mentions: [mention]
      });
    } catch (error) {
      console.error("No pude avisar al usuario de la aprobación:", error.message);
    }
  }
});
