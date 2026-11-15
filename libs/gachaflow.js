"use strict";

const lid = require("./lid");

const TRADE_TTL_MS = 60000;
const GIVEAWAY_TTL_MS = 60000;

const trades = new Map();
const giveaways = new Map();

const flowKey = (chatId, id) => `${chatId}:${id}`;

function findTradeByChat(chatId) {
  for (const trade of trades.values()) {
    if (trade.chatId === chatId) return trade;
  }
  return null;
}

function addTrade(trade) {
  const key = flowKey(trade.chatId, trade.to);
  const timeout = setTimeout(() => trades.delete(key), TRADE_TTL_MS);
  if (timeout.unref) timeout.unref();
  trades.set(key, { ...trade, key, timeout });
}

function removeTrade(trade) {
  clearTimeout(trade.timeout);
  trades.delete(trade.key);
}

function getGiveaway(chatId, id) {
  return giveaways.get(flowKey(chatId, id)) || null;
}

function addGiveaway(entry) {
  const key = flowKey(entry.chatId, entry.from);
  const timeout = setTimeout(() => giveaways.delete(key), GIVEAWAY_TTL_MS);
  if (timeout.unref) timeout.unref();
  giveaways.set(key, { ...entry, key, timeout });
}

function removeGiveaway(entry) {
  clearTimeout(entry.timeout);
  giveaways.delete(entry.key);
}

function parseAccount(args) {
  for (const raw of args) {
    const token = String(raw).trim();
    const lidMatch = token.match(/^(\d{5,})(?::\d+)?@lid$/i);
    if (lidMatch) return `${lidMatch[1]}@lid`;
    const pnMatch = token.match(/^(\d{7,15})(?::\d+)?@s\.whatsapp\.net$/i);
    if (pnMatch) return `${pnMatch[1]}@s.whatsapp.net`;
  }
  const digits = args.join("").replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `${digits}@s.whatsapp.net`;
}

async function accountIds(sock, msg, ...jids) {
  const ids = new Set();
  for (const jid of jids.filter(Boolean)) {
    const base = lid.user(jid);
    if (base) ids.add(base);
    if (lid.isLid(jid)) {
      const pn = await lid.getPN(sock, jid, msg).catch(() => null);
      if (pn) ids.add(lid.user(pn));
    } else if (lid.isPn(jid)) {
      const mapped = await lid.getLID(sock, jid).catch(() => null);
      if (mapped) ids.add(lid.user(mapped));
    }
  }
  return [...ids];
}

function unique(list) {
  return [...new Set(list.filter(Boolean))];
}

function ownerTargets() {
  const all = (global.owner || []).filter((entry) => String(entry[0] || "").replace(/\D/g, ""));
  const main = all.filter((entry) => entry[2] === true);
  const targets = new Set();
  for (const entry of main.length ? main : all) {
    const digits = String(entry[0]).replace(/\D/g, "");
    targets.add(digits.length >= 14 ? `${digits}@lid` : `${digits}@s.whatsapp.net`);
  }
  return [...targets];
}

async function notifyOwners(sock, text, mentions = []) {
  let delivered = 0;
  for (const jid of ownerTargets()) {
    try {
      await sock.sendMessage(jid, { text, mentions });
      delivered++;
    } catch (error) {
      console.error("No pude avisar al owner de la solicitud de harem:", error.message);
    }
  }
  return delivered;
}

function sumValue(list) {
  return list.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
}

function fmtDate(ms) {
  return new Date(ms).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

function parseId(raw) {
  if (!raw) return null;
  const n = Number(String(raw).replace(/^#/, ""));
  return Number.isInteger(n) && n > 0 ? n : null;
}

module.exports = {
  idOf: lid.user,
  findTradeByChat,
  addTrade,
  removeTrade,
  getGiveaway,
  addGiveaway,
  removeGiveaway,
  parseAccount,
  accountIds,
  unique,
  notifyOwners,
  sumValue,
  fmtDate,
  parseId
};
