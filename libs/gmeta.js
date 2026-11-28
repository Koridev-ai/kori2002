"use strict";

const TTL = 60000;
const MAX = 500;

const cache = new Map();
const pending = new Map();
const epochs = new Map();

const isGroup = (chatId) => typeof chatId === "string" && chatId.endsWith("@g.us");
const epochOf = (chatId) => epochs.get(chatId) || 0;

function remember(chatId, data) {
  if (!cache.has(chatId) && cache.size >= MAX) cache.delete(cache.keys().next().value);
  cache.set(chatId, { at: Date.now(), data });
}

function peek(chatId) {
  const hit = cache.get(chatId);
  return hit && Date.now() - hit.at < TTL ? hit.data : undefined;
}

function invalidate(chatId) {
  if (!chatId) return;
  cache.delete(chatId);
  pending.delete(chatId);
  epochs.set(chatId, epochOf(chatId) + 1);
}

function clear() {
  cache.clear();
  pending.clear();
}

async function load(sock, chatId) {
  const epoch = epochOf(chatId);
  const data = await sock.groupMetadata(chatId);
  if (data && epoch === epochOf(chatId)) remember(chatId, data);
  return data;
}

async function get(sock, chatId, { force = false } = {}) {
  if (!isGroup(chatId) || typeof sock?.groupMetadata !== "function") return null;
  if (force) invalidate(chatId);
  else {
    const hit = peek(chatId);
    if (hit) return hit;
  }

  let request = pending.get(chatId);
  if (!request) {
    request = load(sock, chatId).finally(() => {
      if (pending.get(chatId) === request) pending.delete(chatId);
    });
    pending.set(chatId, request);
  }

  try {
    return (await request) || null;
  } catch {
    return cache.get(chatId)?.data || null;
  }
}

function bind(sock) {
  sock.ev.on("group-participants.update", (update) => invalidate(update?.id));
  sock.ev.on("groups.update", (updates) => {
    for (const update of updates || []) invalidate(update?.id);
  });
}

module.exports = { get, peek, invalidate, clear, bind };
