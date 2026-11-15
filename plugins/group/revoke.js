"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

module.exports = gk.define({
  commands: ["revoke", "restablecer"],
  description: "Restablecer el enlace del grupo.",
  admin: true,
  botAdmin: true,
  run: async ({ sock, msg, g }) => {
    await kit.react(sock, msg, "✧");
    await sock.groupRevokeInvite(g.chatId);
    const code = await sock.groupInviteCode(g.chatId);
    const who = pdb.selfJid(msg);
    await kit.reply(sock, msg, `﹒⌗﹒ ✦ .ৎ˚₊‧  El enlace del grupo ha sido restablecido:\n\n𐚁 ֹ ִ \`NEW GROUP LINK\` ! ୧ ֹ ִ\n✧ \`Solicitado por :\` @${gk.mention(who).slice(1)}\n\n❖ \`Enlace :\` https://chat.whatsapp.com/${code}`, { mentions: [who] });
    return kit.react(sock, msg, "✔");
  }
});
