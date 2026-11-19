"use strict";

const fs = require("fs");
const path = require("path");
const groupdb = require("./groupdb");

const FILE = path.resolve(__dirname, "..", "src", "bots.json");
const META_TTL = 45000;
const MAX_META = 300;

const DEFAULTS = {
  namebot: "",
  botname: "",
  prefix: null,
  noprefix: false,
  owner: "",
  self: false,
  banner: "",
  icon: "",
  link: "",
  channel: "",
  type: "Sub"
};

const SOCKET_CMDS = new Set([
  "self",
  "setprefix",
  "setbotprefix",
  "setname",
  "setbotname",
  "setowner",
  "setbotowner",
  "setpfp",
  "setimage",
  "setstatus",
  "setusername",
  "setbanner",
  "setbotbanner",
  "seticon",
  "setboticon",
  "setlink",
  "setbotlink",
  "setchannel",
  "setbotchannel",
  "join",
  "unir",
  "leave",
  "salir",
  "logout",
  "reload",
  "setprimary"
]);

const PRIVATE_OPEN = new Set([
  "menu",
  "help",
  "ayuda",
  "infobot",
  "botinfo",
  "invite",
  "invitar",
  "ping",
  "status",
  "estado",
  "report",
  "reporte",
  "sug",
  "suggest",
  "code",
  "qr",
  "bots",
  "sockets"
]);

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

function number(jid) {
  return String(jid || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
}

function get(id) {
  const key = number(id);
  if (!key) return { ...DEFAULTS };
  const db = load();
  if (!db[key]) {
    db[key] = { ...DEFAULTS, createdAt: Date.now() };
    save();
  }
  const record = db[key];
  for (const [field, value] of Object.entries(DEFAULTS)) {
    if (record[field] === undefined) record[field] = value;
  }
  return record;
}

function peek(id) {
  return load()[number(id)] || null;
}

function set(id, field, value) {
  const key = number(id);
  if (!key) return null;
  const record = get(key);
  record[field] = value;
  save();
  return record;
}

function remove(id) {
  delete load()[number(id)];
  save();
}

function prefixes(id) {
  const settings = get(id);
  const list = Array.isArray(settings.prefix) ? settings.prefix.filter((p) => typeof p === "string" && p) : [];
  if (list.length) return list;
  return [String(global.prefix || ".")];
}

function match(id, text) {
  const settings = get(id);
  const raw = String(text || "");
  const list = prefixes(id).slice().sort((a, b) => b.length - a.length);
  for (const prefix of list) {
    if (raw.startsWith(prefix)) return { prefix, body: raw.slice(prefix.length) };
  }
  if (settings.noprefix) return { prefix: "", body: raw };
  return null;
}

function displayName(id, sock) {
  const settings = get(id);
  return settings.namebot || settings.botname || "Rem";
}

function role(bot, ids, fromMe) {
  if (fromMe) return "self";
  const owner = number(get(bot.id).owner);
  const list = (ids || []).map(number).filter(Boolean);
  if (owner && list.includes(owner)) return "owner";
  if (typeof global.isOwner === "function" && list.some((id) => global.isOwner(id))) return "global";
  return "none";
}

const isSpecific = (value) => value === "self" || value === "owner";

const live = new Map();
let counter = 0;

function register(id, info = {}) {
  const key = number(id);
  if (!key) return null;
  const previous = live.get(key);
  const entry = {
    id: key,
    isMain: !!info.isMain,
    getSock: info.getSock,
    online: true,
    order: previous ? previous.order : ++counter
  };
  live.set(key, entry);
  return entry;
}

function setOnline(id, online) {
  const entry = live.get(number(id));
  if (entry) entry.online = !!online;
}

function unregister(id) {
  live.delete(number(id));
}

function list() {
  return [...live.values()].sort((a, b) => (a.isMain === b.isMain ? a.order - b.order : a.isMain ? -1 : 1));
}

function isLive(id) {
  return live.has(number(id));
}

function botIds(sock) {
  return [number(sock?.user?.id), number(sock?.user?.lid)].filter(Boolean);
}

const meta = new Map();

function invalidate(chatId) {
  meta.delete(chatId);
}

async function members(sock, chatId) {
  const hit = meta.get(chatId);
  if (hit && Date.now() - hit.at < META_TTL) return hit.ids;
  const data = await sock.groupMetadata(chatId).catch(() => null);
  if (!data) return hit ? hit.ids : null;
  const ids = new Set();
  for (const p of data.participants || []) {
    for (const jid of [p.id, p.lid, p.phoneNumber, p.jid]) {
      const n = number(jid);
      if (n) ids.add(n);
    }
  }
  if (meta.size >= MAX_META) meta.delete(meta.keys().next().value);
  meta.set(chatId, { at: Date.now(), ids });
  return ids;
}

function primaryOf(chatId) {
  return number(groupdb.chat(chatId).primaryBot);
}

function setPrimary(chatId, id) {
  groupdb.set(chatId, "primaryBot", id ? number(id) : "");
}

async function candidatesIn(sock, chatId, selfId) {
  const online = list().filter((b) => b.online && b.getSock?.()?.user);
  const ids = await members(sock, chatId);
  if (!ids) return online;
  return online.filter((b) => b.id === selfId || botIds(b.getSock()).some((id) => ids.has(id)));
}

async function elect(sock, chatId, selfId) {
  const candidates = list().filter((b) => b.online && !get(b.id).self && b.getSock?.()?.user);
  if (!candidates.length) return null;
  const primary = primaryOf(chatId);
  if (candidates.length === 1 && !primary) return candidates[0].id;
  const ids = await members(sock, chatId);
  if (!ids) return null;
  const present = candidates.filter((b) => b.id === selfId || botIds(b.getSock()).some((id) => ids.has(id)));
  if (!present.length) return null;
  if (primary) {
    const chosen = present.find((b) => b.id === primary);
    if (chosen) return chosen.id;
  }
  return present[0].id;
}

module.exports = {
  SOCKET_CMDS,
  PRIVATE_OPEN,
  number,
  get,
  peek,
  set,
  remove,
  prefixes,
  match,
  displayName,
  role,
  isSpecific,
  register,
  setOnline,
  unregister,
  list,
  isLive,
  invalidate,
  members,
  primaryOf,
  setPrimary,
  candidatesIn,
  elect,
  flush
};
  
