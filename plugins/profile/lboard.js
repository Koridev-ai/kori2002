"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

const PAGE_SIZE = 10;

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "lboard";
  const args = ctx.args || [];

  try {
    const users = pdb
      .all()
      .filter((u) => (u.exp || 0) >= 1)
      .map((u) => {
        const { current, xp, percent } = pdb.progress(u);
        return { name: u.name || u.id, exp: u.exp || 0, level: u.level || 0, current, xp, percent };
      })
      .sort((a, b) => b.exp - a.exp);

    if (users.length === 0) return kit.reply(sock, msg, "ꕥ No hay usuarios registrados con experiencia.");

    const page = parseInt(args[0]) || 1;
    const totalPages = Math.ceil(users.length / PAGE_SIZE);
    if (page < 1 || page > totalPages) {
      return kit.reply(sock, msg, `《✧》 La página *${page}* no existe. Hay *${totalPages}* páginas.`);
    }

    const start = (page - 1) * PAGE_SIZE;
    let text = "*✩ Top de usuarios con más experiencia ✩*\n\n";
    text += users
      .slice(start, start + PAGE_SIZE)
      .map(
        (u, i) =>
          `✩ ${start + i + 1} › *${u.name}*\n     XP → *${u.exp.toLocaleString()}*  LVL → *${u.level}*\n     ➨ Progreso → *${u.current} => ${u.xp}* _(${u.percent}%)_`
      )
      .join("\n\n");
    text += `\n\n> ⌦ Página *${page}* de *${totalPages}*`;
    if (page < totalPages) text += `\n> Para ver la siguiente página › *${usedPrefix + command} ${page + 1}*`;

    await kit.reply(sock, msg, text);
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["lboard", "lb", "leaderboard"];
handler.description = "Top de usuarios con más experiencia.";
handler.category = "Perfil";
module.exports = handler;
