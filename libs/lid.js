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

const PARTICIPANT_ALTS = ["participantAlt", "participantPn", "participant_pn", "senderPn", "sender_pn"];
const CHAT_ALTS = ["remoteJidAlt", "remoteJidPn", "remote_jid_pn"];
const MISS_TTL = 5 * 60 * 1000;
const ownerLids = new Map();

function altFromMessage(jid, msg) {
  const k = msg?.key || {};
  const id = user(jid);
  const found = [];
  if (k.participant && user(k.participant) === id) found.push(...PARTICIPANT_ALTS.map((f) => k[f]));
  if (k.remoteJid && user(k.remoteJid) === id) found.push(...CHAT_ALTS.map((f) => k[f]));
  const alt = found.find((value) => value && isPn(value));
  return alt ? toPn(alt) : null;
}

function learn(msg) {
  const k = msg?.key;
  if (!k) return;
  for (const raw of [k.participant, k.remoteJid]) {
    if (!raw || !isLid(raw)) continue;
    const pn = altFromMessage(raw, msg);
    if (pn) remember(pnCache, toLid(raw), pn);
  }
}

function jidsOf(msg) {
  const k = msg?.key || {};
  const all = [k.participant, k.remoteJid, ...PARTICIPANT_ALTS.map((f) => k[f]), ...CHAT_ALTS.map((f) => k[f])];
  return all.filter((value) => typeof value === "string" && (isLid(value) || isPn(value)));
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
    altFromMessage(jid, msg) ||
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
  let lid = found && isLid(found) ? toLid(found) : null;

  if (!lid && typeof sock?.onWhatsApp === "function") {
    const result = await sock.onWhatsApp(cacheKey).catch(() => null);
    const entry = Array.isArray(result) ? result.find((item) => item?.lid && isLid(item.lid)) : null;
    lid = entry ? toLid(entry.lid) : null;
  }

  if (lid) {
    remember(lidCache, cacheKey, lid);
    remember(pnCache, lid, cacheKey);
  }
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

async function ownerLid(sock, number) {
  const hit = ownerLids.get(number);
  if (hit && (hit.lid || Date.now() - hit.at < MISS_TTL)) return hit.lid;
  const lid = await getLID(sock, `${number}${PN_SERVER}`).catch(() => null);
  remember(ownerLids, number, { lid: lid ? user(lid) : null, at: Date.now() });
  return lid ? user(lid) : null;
}

async function isListed(sock, msg, list, extra = []) {
  const wanted = new Set((list || []).map((entry) => user(Array.isArray(entry) ? entry[0] : entry)).filter(Boolean));
  if (!wanted.size) return false;

  const lids = new Set();
  const jids = [...jidsOf(msg), ...(extra || []).filter(Boolean)];

  for (const jid of jids) {
    const id = user(jid);
    if (!id) continue;
    if (wanted.has(id)) return true;
    if (!isLid(jid)) continue;
    lids.add(id);
    const pn = await getPN(sock, jid, msg).catch(() => null);
    if (pn && wanted.has(user(pn))) return true;
  }

  if (!lids.size) return false;

  for (const number of wanted) {
    const mapped = await ownerLid(sock, number);
    if (mapped && lids.has(mapped)) return true;
  }
  return false;
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
  sameUser,
  learn,
  isListed
};
