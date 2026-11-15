"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const pdb = require("../../libs/profiledb");

const ROWS = [
  ["Work", "work"],
  ["Slut", "slut"],
  ["Crime", "crime"],
  ["Mine", "mine"],
  ["Ritual", "invoke"],
  ["Fish", "fish"],
  ["Hunt", "hunt"],
  ["Dungeon", "dungeon"],
  ["Adventure", "adventure"],
  ["Steal", "steal"],
  ["Daily", "daily"],
  ["Coffer", "coffer"],
  ["Weekly", "weekly"],
  ["Monthly", "monthly"]
];

const short = (ms) => {
  const total = Math.floor(ms / 1000);
  const parts = [];
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d) parts.push(`${d} d`);
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} m`);
  if (s) parts.push(`${s} s`);
  return parts.length ? parts.join(", ") : "Ahora.";
};

module.exports = eco.define({
  commands: ["infoeconomy", "cooldowns", "economyinfo", "einfo"],
  description: "Ver tu información de economía y cooldowns.",
  run: async ({ sock, msg, jid, me }) => {
    const name = pdb.peek(jid)?.name || msg.pushName || "Usuario";
    const lines = ROWS.map(([label, key]) => `ⴵ ${label} » *${short(eco.remaining(me, key))}*`).join("\n");
    return kit.reply(sock, msg, `✿ Usuario \`<${name}>\`\n\n${lines}\n\n⛁ Coins totales » ${eco.money(me.coins)}`);
  }
});
