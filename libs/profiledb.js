"use strict";

const fs = require("fs");
const path = require("path");
const kit = require("./pluginkit");

const FILE = path.resolve(__dirname, "..", "src", "profile.json");
const MULTIPLIER = 2;
const GROWTH = Math.pow(Math.PI / Math.E, 1.618) * Math.E * 0.75;

let store = null;

function load() {
  if (store) return store;
  try {
    store = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf-8")) : {};
  } catch {
    store = {};
  }
  return store;
}

function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(load(), null, 2));
}

function key(jid) {
  return String(jid || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
}

function selfJid(msg) {
  return msg.key.participant || msg.key.remoteJid;
}

function targetJid(msg) {
  return kit.getMentions(msg)[0] || kit.getQuoted(msg)?.sender || selfJid(msg);
}

function defaults(id) {
  return {
    name: id,
    exp: 0,
    level: 0,
    usedcommands: 0,
    pasatiempo: "",
    description: "",
    marry: "",
    genre: "",
    birth: "",
    afk: -1,
    afkReason: ""
  };
}

function get(jid) {
  const id = key(jid);
  if (!id) return null;
  const db = load();
  if (!db[id]) db[id] = defaults(id);
  return db[id];
}

function peek(jid) {
  return load()[key(jid)] || null;
}

function set(jid, field, value) {
  const user = get(jid);
  user[field] = value;
  save();
  return user;
}

function all() {
  return Object.entries(load()).map(([id, data]) => ({ ...data, id }));
}

function xpRange(level) {
  const lvl = Math.floor(level);
  const min = lvl === 0 ? 0 : Math.round(Math.pow(lvl, GROWTH) * MULTIPLIER) + 1;
  const max = Math.round(Math.pow(lvl + 1, GROWTH) * MULTIPLIER);
  return { min, max, xp: max - min };
}

function levelFromExp(exp) {
  let level = 0;
  while (xpRange(level).max <= exp) level++;
  return level;
}

function progress(user) {
  const { min, xp } = xpRange(user.level || 0);
  const current = Math.max(0, (user.exp || 0) - min);
  const percent = xp > 0 ? Math.min(100, Math.floor((current / xp) * 100)) : 0;
  return { current, xp, percent };
}

function rank(jid, by = "level") {
  const id = key(jid);
  const sorted = all().sort((a, b) => (b[by] || 0) - (a[by] || 0) || (b.exp || 0) - (a.exp || 0));
  const index = sorted.findIndex((u) => u.id === id);
  return index === -1 ? sorted.length + 1 : index + 1;
}

function displayName(jid) {
  const user = peek(jid);
  return user?.name || key(jid);
}

function formatTime(ms) {
  if (typeof ms !== "number" || isNaN(ms)) return "desconocido";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const parts = [];
  if (h) parts.push(`${h} ${h === 1 ? "hora" : "horas"}`);
  if (m) parts.push(`${m} ${m === 1 ? "minuto" : "minutos"}`);
  if (s || (!h && !m)) parts.push(`${s} ${s === 1 ? "segundo" : "segundos"}`);
  return parts.join(" ");
}

function avatarFallback(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&size=512&background=random&color=ffffff&bold=true&format=png`;
}

async function onCommand(sock, msg) {
  const chatId = msg.key.remoteJid;
  const jid = selfJid(msg);
  const user = get(jid);
  if (!user) return;

  if (msg.pushName && user.name !== msg.pushName) user.name = msg.pushName;

  user.usedcommands = (user.usedcommands || 0) + 1;
  user.exp = (user.exp || 0) + Math.floor(Math.random() * 11) + 5;
  const newLevel = levelFromExp(user.exp);
  user.level = newLevel;

  let afkNotice = null;
  if (typeof user.afk === "number" && user.afk > -1) {
    const ms = Date.now() - user.afk;
    afkNotice = `ꕥ *${user.name}* Dejaste de estar inactivo.\n> ○ Motivo » *${user.afkReason || "sin especificar"}*\n> ○ Tiempo inactivo » *${formatTime(ms)}*`;
    user.afk = -1;
    user.afkReason = "";
  }

  save();

  if (afkNotice) await sock.sendMessage(chatId, { text: afkNotice }, { quoted: msg }).catch(() => null);

  const mentioned = [...new Set([...kit.getMentions(msg), kit.getQuoted(msg)?.sender].filter(Boolean))];
  for (const target of mentioned) {
    if (key(target) === key(jid)) continue;
    const data = peek(target);
    if (!data || typeof data.afk !== "number" || data.afk < 0) continue;
    const text = `ꕥ El usuario *${data.name}* está AFK.\n> ○ Motivo » *${data.afkReason || "sin especificar"}*\n> ○ Tiempo inactivo » *${formatTime(Date.now() - data.afk)}*`;
    await sock.sendMessage(chatId, { text }, { quoted: msg }).catch(() => null);
  }
}

module.exports = {
  key,
  selfJid,
  targetJid,
  get,
  peek,
  set,
  all,
  save,
  xpRange,
  levelFromExp,
  progress,
  rank,
  displayName,
  formatTime,
  avatarFallback,
  onCommand
};
