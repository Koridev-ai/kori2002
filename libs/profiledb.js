"use strict";

const fs = require("fs");
const path = require("path");
const kit = require("./pluginkit");
const lid = require("./lid");

const FILE = path.resolve(__dirname, "..", "src", "profile.json");
const MULTIPLIER = 2;
const GROWTH = Math.pow(Math.PI / Math.E, 1.618) * Math.E * 0.75;

const FLUSH_DELAY = 2000;

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
  if (timer) clearTimeout(timer);
  timer = null;
  if (!store) return;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
    fs.renameSync(tmp, FILE);
  } catch {}
}

function save() {
  if (timer) return;
  timer = setTimeout(flush, FLUSH_DELAY);
  if (timer.unref) timer.unref();
}

process.on("exit", () => {
  if (timer) flush();
});

function key(jid) {
  return String(jid || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
}

const resolveJid = (sock, jid, msg) => lid.resolve(sock, jid, msg);

async function prepare(sock, msg) {
  const rawSelf = msg.key.participant || msg.key.remoteJid;
  const rawMentions = kit.getMentions(msg);
  const rawQuoted = kit.getQuoted(msg)?.sender || null;
  const self = await resolveJid(sock, rawSelf, msg);
  const mentions = [];
  for (const raw of rawMentions) mentions.push({ raw, jid: await resolveJid(sock, raw, msg) });
  const quoted = rawQuoted ? { raw: rawQuoted, jid: await resolveJid(sock, rawQuoted, msg) } : null;
  msg.__ids = { rawSelf, self, mentions, quoted };
  return msg.__ids;
}

function selfJid(msg) {
  return msg.__ids?.self || msg.key.participant || msg.key.remoteJid;
}

function rawSelfJid(msg) {
  return msg.__ids?.rawSelf || msg.key.participant || msg.key.remoteJid;
}

function mentionTarget(msg) {
  const ids = msg.__ids;
  if (ids) return ids.mentions[0] || ids.quoted || null;
  const raw = kit.getMentions(msg)[0] || kit.getQuoted(msg)?.sender || null;
  return raw ? { raw, jid: raw } : null;
}

function targetJid(msg) {
  return mentionTarget(msg)?.jid || selfJid(msg);
}

function isOwner(msg, sender) {
  if (msg.key.fromMe && !msg.__sub) return true;
  if (msg.__owner) return true;
  const ids = [key(selfJid(msg)), key(rawSelfJid(msg)), String(sender || "").replace(/[^0-9]/g, "")];
  return ids.some((id) => id && global.isOwner(id));
}

function isMod(msg, sender) {
  if (msg.key.fromMe && !msg.__sub) return true;
  if (msg.__mod || msg.__owner) return true;
  const ids = [key(selfJid(msg)), key(rawSelfJid(msg)), String(sender || "").replace(/[^0-9]/g, "")];
  return ids.some((id) => id && global.isMod(id));
}

function label(jid, raw) {
  const user = peek(jid);
  const id = key(jid);
  if (user?.name && user.name !== id) return { text: user.name, jid: null };
  const shown = raw || jid;
  return { text: `@${key(shown)}`, jid: shown };
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

function peekAny(ids) {
  for (const id of [].concat(ids)) {
    const found = peek(id);
    if (found) return found;
  }
  return null;
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
  await prepare(sock, msg);
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

  const ids = msg.__ids;
  const mentioned = [...ids.mentions.map((m) => m.jid), ids.quoted?.jid].filter(Boolean);
  for (const target of new Set(mentioned.map(key))) {
    if (target === key(jid)) continue;
    const data = peek(target);
    if (!data || typeof data.afk !== "number" || data.afk < 0) continue;
    const text = `ꕥ El usuario *${data.name}* está AFK.\n> ○ Motivo » *${data.afkReason || "sin especificar"}*\n> ○ Tiempo inactivo » *${formatTime(Date.now() - data.afk)}*`;
    await sock.sendMessage(chatId, { text }, { quoted: msg }).catch(() => null);
  }
}

module.exports = {
  key,
  resolveJid,
  prepare,
  selfJid,
  rawSelfJid,
  mentionTarget,
  targetJid,
  isOwner,
  isMod,
  label,
  get,
  peek,
  peekAny,
  set,
  all,
  save,
  flush,
  xpRange,
  levelFromExp,
  progress,
  rank,
  displayName,
  formatTime,
  avatarFallback,
  onCommand
};
