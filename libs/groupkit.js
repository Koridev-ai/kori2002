"use strict";

const kit = require("./pluginkit");
const pdb = require("./profiledb");
const lid = require("./lid");

const idsOf = (p) => [p.id, p.lid, p.phoneNumber, p.jid].filter(Boolean).map((jid) => lid.user(jid)).filter(Boolean);
const isAdminP = (p) => !!p && (p.admin === "admin" || p.admin === "superadmin");

function ownerNumbers() {
  const set = new Set();
  for (const entry of global.owner || []) {
    const id = String(Array.isArray(entry) ? entry[0] : entry || "").replace(/[^0-9]/g, "");
    if (id) set.add(id);
  }
  return set;
}

async function context(sock, msg) {
  const chatId = msg.key.remoteJid;
  if (!chatId.endsWith("@g.us")) return { isGroup: false, chatId };
  const meta = await sock.groupMetadata(chatId).catch(() => null);
  const participants = meta?.participants || [];
  const find = (...jids) => {
    const nums = jids.filter(Boolean).map((jid) => lid.user(jid));
    return participants.find((p) => idsOf(p).some((id) => nums.includes(id))) || null;
  };
  const me = find(msg.key.participant, msg.key.participantAlt, pdb.selfJid(msg), pdb.rawSelfJid(msg));
  const bot = find(sock.user?.id, sock.user?.lid);
  return {
    isGroup: true,
    chatId,
    meta,
    participants,
    me,
    bot,
    find,
    isAdmin: isAdminP(me),
    isBotAdmin: isAdminP(bot),
    owners: ownerNumbers()
  };
}

function isProtected(p, g, { admins = false } = {}) {
  if (!p) return true;
  if (g.bot && p.id === g.bot.id) return true;
  if (p.admin === "superadmin") return true;
  if (admins && isAdminP(p)) return true;
  return idsOf(p).some((id) => g.owners.has(id));
}

async function ownerCheck(sock, msg, sender) {
  if (msg.__owner) return true;
  const resolved = await lid.resolve(sock, msg.key.participant, msg).catch(() => null);
  const ids = [sender, lid.user(resolved), lid.user(msg.key.participant), lid.user(msg.key.participantAlt)];
  return ids.some((id) => id && global.isOwner(id));
}

function target(msg, g) {
  const t = pdb.mentionTarget(msg);
  if (!t) return null;
  const p = g.find(t.jid, t.raw);
  return { p, jid: p?.id || t.raw || t.jid, raw: t.raw, number: lid.user(p?.id || t.raw || t.jid) };
}

function define({ commands, description, admin = false, botAdmin = false, group = true, run }) {
  const handler = async (msg, ctx = {}) => {
    const sock = ctx.conn;
    const usedPrefix = ctx.usedPrefix || global.prefix || ".";
    const command = ctx.command || commands[0];
    try {
      const g = await context(sock, msg);
      if (group && !g.isGroup) return kit.reply(sock, msg, "《✧》 Este comando solo puede usarse en grupos.");
      const owner = pdb.isOwner(msg, ctx.sender);
      if (admin && !g.isAdmin && !owner) return kit.reply(sock, msg, "《✧》 Solo los *administradores* pueden usar este comando.");
      if (botAdmin && !g.isBotAdmin) return kit.reply(sock, msg, "《✧》 Necesito ser *administrador* para ejecutar este comando.");
      const args = (ctx.args || []).filter(Boolean);
      return await run({ sock, msg, ctx, g, usedPrefix, command, args, text: args.join(" "), owner });
    } catch (e) {
      return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
    }
  };
  handler.command = commands;
  handler.description = description;
  handler.category = "Grupo";
  return handler;
}

function msParser(str) {
  const match = String(str || "").match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2].toLowerCase()];
  return num * unit;
}

function clockString(ms) {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms / 3600000) % 24;
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  const parts = [];
  if (d > 0) parts.push(`${d} ${d === 1 ? "día" : "días"}`);
  if (h > 0) parts.push(`${h} ${h === 1 ? "hora" : "horas"}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? "minuto" : "minutos"}`);
  if (s > 0) parts.push(`${s} ${s === 1 ? "segundo" : "segundos"}`);
  return parts.join(" ");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const mention = (jid) => `@${lid.user(jid)}`;
const nowText = () =>
  new Date().toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

module.exports = { context, isAdminP, isProtected, ownerCheck, target, define, msParser, clockString, sleep, mention, nowText, idsOf };
