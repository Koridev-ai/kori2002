"use strict";

const fs = require("fs");
const path = require("path");
const gk = require("./groupkit");
const gdb = require("./groupdb");
const kit = require("./pluginkit");
const pdb = require("./profiledb");

const FILE = path.resolve(__dirname, "..", "src", "economy.json");

let store = null;
let timer = null;

function load() {
  if (store) return store;
  try {
    store = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf-8")) : {};
  } catch {
    store = {};
  }
  return store;
}

function flush() {
  timer = null;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(load(), null, 2));
  } catch {}
}

function save() {
  if (timer) return;
  timer = setTimeout(flush, 2000);
  if (timer.unref) timer.unref();
}

process.on("exit", () => {
  if (timer) flush();
});

const key = (jid) => String(jid || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");

function normalize(a) {
  if (typeof a.coins !== "number") a.coins = 0;
  if (typeof a.bank !== "number") a.bank = 0;
  if (typeof a.health !== "number") a.health = 100;
  if (typeof a.stamina !== "number") a.stamina = 100;
  if (typeof a.magic !== "number") a.magic = 100;
  if (!a.cd) a.cd = {};
  if (!a.tools || typeof a.tools !== "object") a.tools = {};
  if (!a.weapons || typeof a.weapons !== "object") a.weapons = {};
  if (!a.inventory || typeof a.inventory !== "object") a.inventory = {};
  return a;
}

function account(chatId, jid) {
  const db = load();
  if (!db[chatId]) db[chatId] = {};
  const id = key(jid);
  if (!db[chatId][id]) db[chatId][id] = {};
  return normalize(db[chatId][id]);
}

function peek(chatId, jid) {
  const found = load()[chatId]?.[key(jid)];
  return found ? normalize(found) : null;
}

function all(chatId) {
  return Object.entries(load()[chatId] || {}).map(([id, a]) => ({ id, ...normalize(a) }));
}

function currency() {
  return global.currency || "Yenes";
}

const money = (n) => `¥${Math.floor(n || 0).toLocaleString()} ${currency()}`;

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [];
  if (d) parts.push(`${d} día${d !== 1 ? "s" : ""}`);
  if (h) parts.push(`${h} hora${h !== 1 ? "s" : ""}`);
  if (m) parts.push(`${m} minuto${m !== 1 ? "s" : ""}`);
  if (s || !parts.length) parts.push(`${s} segundo${s !== 1 ? "s" : ""}`);
  return parts.join(" ");
}

function remaining(a, name) {
  return Math.max(0, (a.cd[name] || 0) - Date.now());
}

function setCooldown(a, name, ms) {
  a.cd[name] = Date.now() + ms;
  save();
}

function parseAmount(raw, max) {
  const text = String(raw || "").toLowerCase().trim();
  if (text === "all") return max;
  const n = parseInt(text.replace(/[¥,.\s]/g, ""), 10);
  return Number.isFinite(n) ? n : NaN;
}

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

function loseMoney(a, amount) {
  const total = a.coins + a.bank;
  if (total <= amount) {
    a.coins = 0;
    a.bank = 0;
    save();
    return total;
  }
  if (a.coins >= amount) {
    a.coins -= amount;
  } else {
    a.bank -= amount - a.coins;
    a.coins = 0;
  }
  save();
  return amount;
}

function fill(text, amount) {
  return String(text).split("{money}").join(`*${money(amount)}*`);
}

function define({ commands, description, run }) {
  const handler = gk.define({
    commands,
    description,
    run: async (c) => {
      const chat = gdb.chat(c.g.chatId);
      if (chat.adminonly || !chat.economy) {
        return kit.reply(
          c.sock,
          c.msg,
          `ꕥ Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${c.usedPrefix}economy on*`
        );
      }
      const jid = pdb.selfJid(c.msg);
      return run({ ...c, jid, me: account(c.g.chatId, jid), chatId: c.g.chatId });
    }
  });
  handler.category = "Economía";
  return handler;
}

function claimPlugin({ commands, description, name, label, gap, maxStreak, base, step, cap, glyph, unit, streakField, lastField }) {
  return define({
    commands,
    description,
    run: async ({ sock, msg, jid, me }) => {
      const now = Date.now();
      const wait = remaining(me, name);
      if (wait > 0) {
        return kit.reply(sock, msg, `ꕥ Ya has reclamado tu recompensa ${label}.\n> Puedes reclamarlo de nuevo en *${formatTime(wait)}*`);
      }
      const profile = pdb.get(jid);
      let streak = profile[streakField] || 0;
      const lastGlobal = profile[lastField] || 0;
      const lost = streak >= 1 && now - lastGlobal > gap * 1.5;
      if (lost) {
        streak = 0;
        pdb.set(jid, streakField, 0);
      }
      if (now - lastGlobal >= gap) {
        streak = Math.min(streak + 1, maxStreak);
        pdb.set(jid, streakField, streak);
        pdb.set(jid, lastField, now);
      }
      streak = Math.max(streak, 1);
      const reward = Math.min(base + (streak - 1) * step, cap);
      me.coins += reward;
      setCooldown(me, name, gap);
      const next = Math.min(base + streak * step, cap);
      let text = `「${glyph}」Has reclamado tu recompensa ${label} de *${money(reward)}*! (${unit} *${streak}*)\n> ${unit} *${streak + 1}* » *+¥${next.toLocaleString()}*`;
      if (lost) text += `\n> ☆ ¡Has perdido tu racha de ${unit === "Día" ? "días" : unit === "Semana" ? "semanas" : "meses"}!`;
      return kit.reply(sock, msg, text);
    }
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { sleep, rand, pick, loseMoney, fill, account, peek, all, currency, money, formatTime, remaining, setCooldown, parseAmount, define, claimPlugin, save, flush, key };
        
