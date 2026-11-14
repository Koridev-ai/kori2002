"use strict";

const PN_SERVER = "@s.whatsapp.net";
const LID_SERVER = "@lid";
const MAX_CACHE = 5000;

const pnCache = new Map();
const lidCache = new Map();

const isLid = (jid) => typeof jid === "string" && (jid.endsWith(LID_SERVER) || jid.endsWith("@hosted.lid"));
const isPn = (jid) => typeof jid === "string" && (jid.endsWith(PN_SERVER) || jid.endsWith("@hosted"));

function user(jid) {
  return String(jid || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
}

function toPn(value) {
  const id = user(value);
  return id ? `${id}${PN_SERVER}` : null;
}

function toLid(value) {
  const id = user(value);
  return id ? `${id}${LID_SERVER}` : null;
}

function remember(map, from, to) {
  if (map.size >= MAX_CACHE) map.delete(map.keys().next().value);
  map.set(from, to);
}

function mapping(sock) {
  return sock?.signalRepository?.lidMapping || null;
}

async function pnFromMessage(jid, msg) {
  const k = msg?.key || {};
  const alts = [];
  if (k.participant && user(k.participant) === user(jid)) alts.push(k.participantAlt);
  if (k.remoteJid && user(k.remoteJid) === user(jid)) alts.push(k.remoteJidAlt);
  const alt = alts.find((value) => value && isPn(value));
  return alt ? toPn(alt) : null;
}

async function pnFromStore(sock, jid) {
  const store = mapping(sock);
  if (!store) return null;
  const lid = toLid(jid);

  const cached = store.phoneCache?.getPhoneForLid?.(lid);
  if (cached && !isLid(cached)) return toPn(cached);

  const stored = await Promise.resolve(store.getPNForLID?.(lid)).catch(() => null);
  return stored && !isLid(stored) ? toPn(stored) : null;
}

async function pnFromGroup(sock, jid, chatId) {
  if (!chatId || !chatId.endsWith("@g.us") || typeof sock?.groupMetadata !== "function") return null;
  const meta = await sock.groupMetadata(chatId).catch(() => null);
  const id = user(jid);
  const participant = meta?.participants?.find((p) => user(p.id) === id || user(p.lid) === id);
  const pn = [participant?.phoneNumber, participant?.jid, participant?.id].find((value) => value && isPn(value));
  return pn ? toPn(pn) : null;
}

async function getPN(sock, jid, msg) {
  if (!jid) return null;
  if (isPn(jid)) return toPn(jid);
  if (!isLid(jid)) return null;

  const cacheKey = toLid(jid);
  if (pnCache.has(cacheKey)) return pnCache.get(cacheKey);

  const pn =
    (await pnFromMessage(jid, msg)) ||
    (await pnFromStore(sock, jid)) ||
    (await pnFromGroup(sock, jid, msg?.key?.remoteJid));

  if (pn) remember(pnCache, cacheKey, pn);
  return pn;
}

async function getLID(sock, jid) {
  if (!jid) return null;
  if (isLid(jid)) return toLid(jid);
  if (!isPn(jid)) return null;

  const cacheKey = toPn(jid);
  if (lidCache.has(cacheKey)) return lidCache.get(cacheKey);

  const store = mapping(sock);
  const found = await Promise.resolve(store?.getLIDForPN?.(cacheKey)).catch(() => null);
  const lid = found && isLid(found) ? toLid(found) : null;

  if (lid) remember(lidCache, cacheKey, lid);
  return lid;
}

async function resolve(sock, jid, msg) {
  if (!jid) return jid;
  if (!isLid(jid)) return jid;
  return (await getPN(sock, jid, msg)) || jid;
}

async function number(sock, jid, msg) {
  const pn = await getPN(sock, jid, msg);
  return pn ? user(pn) : null;
}

async function sameUser(sock, a, b, msg) {
  if (!a || !b) return false;
  if (user(a) === user(b)) return true;
  const [ra, rb] = await Promise.all([resolve(sock, a, msg), resolve(sock, b, msg)]);
  return user(ra) === user(rb);
}

module.exports = {
  isLid,
  isPn,
  user,
  toPn,
  toLid,
  getPN,
  getLID,
  resolve,
  number,
  sameUser
};
