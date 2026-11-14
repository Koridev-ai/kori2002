"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "level";

  try {
    const who = pdb.targetJid(msg);
    const user = pdb.get(who);
    if (!user) return kit.reply(sock, msg, "「✎」 El usuario mencionado no está registrado en el bot.");

    const { current, xp, percent } = pdb.progress(user);
    const rank = pdb.rank(who);

    const text = `*「✿」Usuario* ◢ ${user.name} ◤

❖ Nivel › *${user.level || 0}*
☆ Experiencia › *${(user.exp || 0).toLocaleString()}*
➨ Progreso › *${current} => ${xp}* _(${percent}%)_
✐ Puesto › *#${rank}*
❒ Comandos ejecutados › *${(user.usedcommands || 0).toLocaleString()}*`;

    await sock.sendMessage(chatId, { text, mentions: [who] }, { quoted: msg });
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["level", "lvl"];
handler.description = "Ver tu nivel y experiencia actual.";
handler.category = "Perfil";
module.exports = handler;
