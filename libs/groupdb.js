"use strict";

const fs = require("fs");
const path = require("path");

const FILE = path.resolve(__dirname, "..", "src", "groups.json");

const DEFAULTS = {
  disabled: false,
  welcome: false,
  goodbye: false,
  alerts: false,
  antilinks: false,
  adminonly: false,
  sWelcome: "",
  sGoodbye: "",
  warnLimit: 3,
  expulsar: false
};

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
  timer = setTimeout(flush, 3000);
  if (timer.unref) timer.unref();
}

process.on("exit", () => {
  if (timer) flush();
});

function key(jid) {
  return String(jid || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
}

function chat(chatId) {
  const db = load();
  if (!db[chatId]) {
    db[chatId] = { ...DEFAULTS, since: Date.now(), users: {} };
    save();
  }
  const record = db[chatId];
  for (const [field, value] of Object.entries(DEFAULTS)) {
    if (record[field] === undefined) record[field] = value;
  }
  if (!record.since) record.since = Date.now();
  if (!record.users) record.users = {};
  return record;
}

function set(chatId, field, value) {
  chat(chatId)[field] = value;
  save();
}

function peekUser(chatId, jid) {
  return chat(chatId).users[key(jid)] || null;
}

function user(chatId, jid) {
  const record = chat(chatId);
  const id = key(jid);
  if (!record.users[id]) record.users[id] = { warnings: [], stats: {}, last: 0 };
  const u = record.users[id];
  if (!Array.isArray(u.warnings)) u.warnings = [];
  if (!u.stats) u.stats = {};
  return u;
}

function track(chatId, jid, isCommand) {
  const id = key(jid);
  if (!id) return;
  const u = user(chatId, id);
  const day = new Date().toISOString().slice(0, 10);
  if (!u.stats[day]) u.stats[day] = { msgs: 0, cmds: 0 };
  u.stats[day].msgs++;
  if (isCommand) u.stats[day].cmds++;
  u.last = Date.now();
  save();
}

function periodStats(u, days) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const entries = Object.entries(u?.stats || {})
    .filter(([date]) => date >= cutoff)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1));
  return {
    entries,
    msgs: entries.reduce((acc, [, d]) => acc + (d.msgs || 0), 0),
    cmds: entries.reduce((acc, [, d]) => acc + (d.cmds || 0), 0)
  };
}

function trackedDays(chatId) {
  return (Date.now() - (chat(chatId).since || Date.now())) / 86400000;
}

function removeUser(chatId, jid) {
  delete chat(chatId).users[key(jid)];
  save();
}

module.exports = { key, chat, set, user, peekUser, track, periodStats, trackedDays, removeUser, save, flush };
