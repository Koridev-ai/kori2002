"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

module.exports = gk.define({
  commands: ["link"],
  description: "Obtener el enlace del grupo.",
  botAdmin: true,
  run: async ({ sock, msg, g }) => {
    const code = await sock.groupInviteCode(g.chatId);
    const who = pdb.selfJid(msg);
    return kit.reply(sock, msg, `﹒⌗﹒ ✦ .ৎ˚₊‧  Aquí tienes el link del grupo:\n\n𐚁 ֹ ִ \`GROUP LINK\` ! ୧ ֹ ִ\n✧ \`Solicitado por :\` @${gk.mention(who).slice(1)}\n\n❖ \`Enlace :\` https://chat.whatsapp.com/${code}`, { mentions: [who] });
  }
});
