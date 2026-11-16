"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const MENU_BANNER = path.join(__dirname, "..", "media", "menu.jpg");

function ownerJids() {
  const seen = new Set();
  const list = [];
  for (const entry of global.owner || []) {
    const id = String(Array.isArray(entry) ? entry[0] : entry || "").replace(/[^0-9]/g, "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    list.push(id.length >= 14 ? `${id}@lid` : `${id}@s.whatsapp.net`);
  }
  return list;
}

async function notifyOwners(sock, text) {
  let delivered = 0;
  for (const jid of ownerJids()) {
    try {
      await sock.sendMessage(jid, { text });
      delivered++;
    } catch {}
  }
  return delivered;
}

function msToTime(duration) {
  const total = Math.max(0, Math.floor(duration / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const parts = [];
  if (days) parts.push(`${days} día${days > 1 ? "s" : ""}`);
  if (hours) parts.push(`${hours} hora${hours > 1 ? "s" : ""}`);
  if (minutes) parts.push(`${minutes} minuto${minutes > 1 ? "s" : ""}`);
  parts.push(`${seconds} segundo${seconds !== 1 ? "s" : ""}`);
  return parts.join(", ");
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(bytes) || 0;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(2).replace(/\.?0+$/, "")} ${units[i]}`;
}

function memoryStats() {
  const total = os.totalmem();
  const constrained = typeof process.constrainedMemory === "function" ? process.constrainedMemory() : 0;
  const limit = Number.isFinite(constrained) && constrained > 0 && constrained < total ? constrained : total;
  const used = process.memoryUsage().rss;
  return { used, limit, percent: limit > 0 ? (used / limit) * 100 : 0 };
}

function compact(number) {
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}k`;
  return String(number);
}

async function sendWithBanner(sock, msg, text, mentions = []) {
  const chatId = msg.key.remoteJid;
  try {
    const custom = require("./botmedia").bannerBuffer(sock.user?.id);
    return await sock.sendMessage(chatId, { image: custom || fs.readFileSync(MENU_BANNER), caption: text, mentions }, { quoted: msg });
  } catch {
    return sock.sendMessage(chatId, { text, mentions }, { quoted: msg });
  }
}

module.exports = { ownerJids, notifyOwners, msToTime, formatBytes, memoryStats, compact, sendWithBanner };
