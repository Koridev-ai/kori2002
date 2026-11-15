"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");
const eco = require("../../libs/ecokit");
const flow = require("../../libs/gachaflow");

module.exports = gacha.define({
  commands: ["solicitarharem", "recuperarharem", "pedirharem"],
  description: "Solicita pasar el harem de tu cuenta anterior (baneada) a esta cuenta; el owner debe aprobarlo.",
  run: async ({ sock, msg, chatId, id, jid, args, usedPrefix }) => {
    const target = gacha.target(msg);
    const oldJid = target ? target.jid : flow.parseAccount(args);
    if (!oldJid) {
      return kit.reply(
        sock,
        msg,
        "❀ Menciona a tu cuenta anterior (@), responde a un mensaje suyo o escribe su número con código de país y sin símbolos.\n" +
          `> Ejemplo: *${usedPrefix}solicitarharem 5216641234567*`
      );
    }

    const oldIds = await flow.accountIds(sock, msg, oldJid, target && target.raw);
    const mine = new Set([id, pdb.key(pdb.rawSelfJid(msg)), ...(await flow.accountIds(sock, msg, jid))]);
    if (oldIds.some((a) => mine.has(a))) {
      return kit.reply(sock, msg, "ꕥ Ese número es esta misma cuenta. Escribe el de tu cuenta anterior.");
    }

    if (gacha.getPendingHaremRequestByNew(id)) {
      return kit.reply(sock, msg, "《✧》 Ya tienes una solicitud pendiente. Espera a que el owner la revise.");
    }

    const harem = gacha.collectHarem(oldIds);
    if (!harem.length) {
      return kit.reply(
        sock,
        msg,
        "ꕥ No encontré personajes en esa cuenta. Revisa que el número esté completo y tal como lo tenías en WhatsApp " +
          "(algunos países llevan un dígito extra, por ejemplo 521 en México)."
      );
    }

    const request = gacha.createHaremRequest({ oldJid, oldIds, newId: id, chatId });
    const totalValue = flow.sumValue(harem);

    const delivered = await flow.notifyOwners(
      sock,
      `「✿」 *Solicitud de harem #${request.id}*\n\n` +
        `❏ Cuenta nueva » *${gacha.displayName(id)}* (@${id})\n` +
        `❏ Cuenta anterior » *${flow.idOf(oldJid)}*\n` +
        `❏ Personajes » *${harem.length}*\n` +
        `❏ Valor total » *${eco.money(totalValue)}*\n\n` +
        `✐ Ver detalle: *${usedPrefix}haremreq ${request.id}*\n` +
        `✐ Aprobar: *${usedPrefix}aprobarharem ${request.id}*\n` +
        `✐ Rechazar: *${usedPrefix}rechazarharem ${request.id}*`,
      [jid]
    );

    return kit.reply(
      sock,
      msg,
      `「✿」 Solicitud *#${request.id}* enviada. El owner la revisará y te avisaré aquí cuando la apruebe o rechace.\n\n` +
        `> ❏ Personajes encontrados » *${harem.length}*` +
        (delivered ? "" : "\n> ⚠︎ No pude avisar al owner por mensaje privado; quedó guardada para que la revise.")
    );
  }
});
