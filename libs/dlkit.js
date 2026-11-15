"use strict";

const axios = require("axios");
const kit = require("./pluginkit");
const nsfw = require("./nsfwkit");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const DEFAULT_APIS = {
  vreden: { url: "https://api.vreden.web.id", key: null },
  ootaizumi: { url: "https://api.ootaizumi.web.id", key: null },
  delirius: { url: "https://api.delirius.online", key: null },
  zenzxz: { url: "https://api.zenzxz.my.id", key: null },
  siputzx: { url: "https://app.siputzx.my.id", key: null },
  lempi: { url: "https://api.lempi.lat", key: "montekey28" },
  fare: { url: "https://fare.ink", key: null },
  tikwm: { url: "https://www.tikwm.com", key: null }
};

function api(name) {
  const custom = (global.APIs || {})[name] || {};
  return { ...DEFAULT_APIS[name], ...custom };
}

async function getJson(url, { params, headers, timeout = 30000, method = "get", data } = {}) {
  const res = await axios({
    url,
    method,
    params,
    data,
    timeout,
    headers: { "User-Agent": UA, Accept: "application/json", ...headers },
    validateStatus: (s) => s >= 200 && s < 300
  });
  return res.data;
}

async function getText(url, { headers, timeout = 30000 } = {}) {
  const res = await axios.get(url, {
    timeout,
    maxRedirects: 8,
    headers: { "User-Agent": UA, ...headers },
    responseType: "text",
    transformResponse: (d) => d,
    validateStatus: () => true
  });
  return { status: res.status, body: String(res.data || ""), finalUrl: res.request?.res?.responseUrl || url };
}

async function getBuffer(url, { headers, timeout = 90000, max = 120 * 1024 * 1024 } = {}) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout,
    maxContentLength: max,
    maxBodyLength: max,
    headers: { "User-Agent": UA, ...headers }
  });
  return Buffer.from(res.data);
}

async function remoteSize(url) {
  try {
    const head = await axios.head(url, { timeout: 15000, headers: { "User-Agent": UA }, maxRedirects: 5 });
    const n = Number(head.headers["content-length"]);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {}
  try {
    const res = await axios.get(url, { timeout: 15000, headers: { "User-Agent": UA, Range: "bytes=0-0" }, responseType: "stream", maxRedirects: 5 });
    res.data.destroy();
    const m = String(res.headers["content-range"] || "").match(/\/(\d+)$/);
    if (m) return Number(m[1]);
  } catch {}
  return null;
}

function deepFind(obj, keys) {
  const queue = [obj];
  const seen = new Set();
  const hits = {};
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string" && /^https?:\/\//i.test(v) && keys.includes(k) && !hits[k]) hits[k] = v;
      else if (v && typeof v === "object") queue.push(v);
    }
  }
  for (const key of keys) if (hits[key]) return hits[key];
  return null;
}

async function chain(providers) {
  let lastError = null;
  for (const run of providers) {
    try {
      const result = await run();
      if (result) return result;
    } catch (e) {
      lastError = e;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  if (lastError) throw lastError;
  return null;
}

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!n || Number.isNaN(n)) return "Desconocido";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function parseSize(text) {
  const m = String(text || "").trim().match(/([\d.,]+)\s*(bytes?|b|kb|kib|mb|mib|gb|gib)/i);
  if (!m) return 0;
  const value = Number(m[1].replace(",", "."));
  const mult = { b: 1, byte: 1, bytes: 1, kb: 1024, kib: 1024, mb: 1048576, mib: 1048576, gb: 1073741824, gib: 1073741824 };
  return Math.round(value * (mult[m[2].toLowerCase()] || 1));
}

function youtubeId(text = "") {
  const raw = String(text).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  const m = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|[?&]v=)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function cleanName(name, fallback = "archivo") {
  return String(name || fallback).replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 120) || fallback;
}

function cap(title, lines) {
  return `✦ ${title}\n\n${lines.filter(Boolean).map(([k, v]) => `❖ *${k} ›* ${v}`).join("\n")}`;
}

function sendAlbum(sock, chatId, items, quoted) {
  if (typeof sock.sendAlbumMessage === "function" && items.length > 1) {
    return sock.sendAlbumMessage(chatId, items, { quoted });
  }
  return (async () => {
    for (const item of items) {
      const content = item.type === "video" ? { video: item.data, caption: item.caption } : { image: item.data, caption: item.caption };
      await sock.sendMessage(chatId, content, { quoted });
      await new Promise((r) => setTimeout(r, 700));
    }
  })();
}

function define({ commands, description, run }) {
  const handler = async (msg, ctx = {}) => {
    const sock = ctx.conn;
    const usedPrefix = ctx.usedPrefix || global.prefix || ".";
    const command = ctx.command || commands[0];
    try {
      const args = (ctx.args || []).filter(Boolean);
      return await run({ sock, msg, ctx, usedPrefix, command, args, text: args.join(" "), chatId: msg.key.remoteJid });
    } catch (e) {
      await kit.react(sock, msg, "✖").catch(() => null);
      return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
    }
  };
  handler.command = commands;
  handler.description = description;
  handler.category = "Descargas";
  return handler;
}

module.exports = {
  UA,
  api,
  getJson,
  getText,
  getBuffer,
  remoteSize,
  deepFind,
  chain,
  formatBytes,
  parseSize,
  youtubeId,
  cleanName,
  cap,
  sendAlbum,
  define,
  nsfw
};
