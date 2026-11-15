"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");

function formatElapsed(ms) {
  if (!ms || ms <= 0) return "—";
  const sec = Math.floor(ms / 1000);
  const parts = [];
  const w = Math.floor(sec / 604800);
  const d = Math.floor((sec % 604800) / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (w) parts.push(`${w}w`);
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s) parts.push(`${s}s`);
  return parts.join(" ");
}

module.exports = gacha.define({
  commands: ["charinfo", "winfo", "waifuinfo"],
  description: "Muestra información detallada de un personaje.",
  run: async ({ sock, msg, chatId, text, usedPrefix, command }) => {
    if (!text) return kit.reply(sock, msg, `❀ Por favor, proporciona el nombre de un personaje.\n> Ejemplo » *${usedPrefix}${command} Rem*`);

    const character = gacha.findCharacterByQuery(text);
    if (!character) return kit.reply(sock, msg, `ꕥ No se encontró el personaje *${text}*.`);

    const ownership = gacha.getOwnership(character.id);
    let statusLine = "*Libre*";
    let claimedLine = "";
    const mentions = [];
    if (ownership) {
      statusLine = `Reclamado por *${gacha.displayName(ownership.owner)}*`;
      mentions.push(gacha.mentionJid(ownership.owner));
      claimedLine = `\nⴵ Fecha de reclamo » *${new Date(ownership.claimedAt).toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}*`;
    }

    const rank = gacha.getCharactersByValue().findIndex((c) => c.id === character.id) + 1;
    const stats = gacha.getCharacterVoteStats(character.id);
    const lastVote = stats.lastVotedAt ? `hace *${formatElapsed(Date.now() - stats.lastVotedAt)}*` : "*Nunca*";

    const caption =
      `❀ Nombre » *${character.name}*\n` +
      `✎ ID » \`${character.id}\`\n` +
      `⚥ Género » *${character.gender}*\n` +
      `✰ Valor » *${eco.money(character.value)}*\n` +
      `♡ Estado » ${statusLine}${claimedLine}\n` +
      `❖ Serie » *${character.series}*\n` +
      `❏ Puesto » *#${rank || "—"}*\n` +
      `ⴵ Último voto » ${lastVote}`;

    return sock.sendMessage(chatId, { text: caption, mentions }, { quoted: msg });
  }
});
