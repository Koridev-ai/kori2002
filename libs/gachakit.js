"use strict";

const fs = require("fs");
const path = require("path");
const kit = require("./pluginkit");
const pdb = require("./profiledb");

const FILE = path.resolve(__dirname, "..", "src", "gacha.json");

const ROLL_COOLDOWN_MS = 15 * 60 * 1000;
const CLAIM_COOLDOWN_MS = 30 * 60 * 1000;
const VOTE_COOLDOWN_MS = 60 * 60 * 1000;
const VOTE_DAILY_CAP = 900;
const SALE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const ROLL_RESERVED_MS = 20000;
const ROLL_EXPIRES_MS = 60000;
const ROLL_KEEP_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const TAG_TTL_MS = { character: 30 * DAY_MS, other: 30 * DAY_MS, no_image: 3 * DAY_MS };

const SECTIONS = ["characters", "owned", "users", "market", "rolls", "votes", "voteCooldowns", "claimMessages", "tagCache", "seriesRuns", "haremRequests"];

let store = null;
let timer = null;
let cache = null;

function load() {
  if (store) return store;
  try {
    store = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf-8")) : {};
  } catch {
    store = {};
  }
  for (const section of SECTIONS) {
    if (!store[section] || typeof store[section] !== "object") store[section] = {};
  }
  return store;
}

function flush() {
  timer = null;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(load()));
    fs.renameSync(tmp, FILE);
  } catch (error) {
    console.error("❌ No se pudo guardar gacha.json:", error.message);
  }
}

function save() {
  if (timer) return;
  timer = setTimeout(flush, 3000);
  if (timer.unref) timer.unref();
}

process.on("exit", () => {
  if (timer) flush();
});

function invalidate() {
  cache = null;
}

function slugify(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCharacterKey(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .sort()
    .join(" ");
}

function randomValue() {
  return Math.floor(Math.random() * (8000 - 3000 + 1)) + 3000;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function catalog() {
  if (cache) return cache;
  const list = Object.values(load().characters).sort((a, b) => b.createdAt - a.createdAt);
  const bySeries = new Map();
  for (const character of list) {
    if (!bySeries.has(character.series)) bySeries.set(character.series, []);
    bySeries.get(character.series).push(character);
  }
  for (const group of bySeries.values()) group.sort((a, b) => b.value - a.value);
  cache = { list, lowerNames: list.map((c) => c.name.toLowerCase()), byValue: null, bySeries };
  return cache;
}

function addCharacter(data) {
  const id = slugify(data.tag);
  const db = load();
  if (!id || db.characters[id]) return { inserted: false, id };
  db.characters[id] = {
    id,
    name: data.name,
    series: data.series,
    gender: data.gender,
    tag: data.tag,
    value: data.value,
    createdAt: Date.now()
  };
  invalidate();
  save();
  return { inserted: true, id };
}

function getCharacterById(id) {
  return load().characters[id] || null;
}

function getCharacterByTag(tag) {
  return load().characters[slugify(tag)] || null;
}

function characterExists(tag) {
  return !!getCharacterByTag(tag);
}

function countCharacters() {
  return catalog().list.length;
}

function getAllCharacters() {
  return catalog().list;
}

function getCharactersByValue() {
  const c = catalog();
  if (!c.byValue) c.byValue = [...c.list].sort((a, b) => b.value - a.value);
  return c.byValue;
}

function findCharacterByQuery(query) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return null;

  const byId = load().characters[q] || load().characters[slugify(q)];
  if (byId) return byId;

  const { list, lowerNames } = catalog();
  const words = q.split(/\s+/).filter(Boolean);
  let partial = null;
  let byWord = null;

  for (let i = 0; i < list.length; i++) {
    const name = lowerNames[i];
    if (name === q) return list[i];
    if (partial) continue;
    if (name.includes(q)) {
      partial = list[i];
      continue;
    }
    if (!byWord && words.some((w) => name.includes(w))) byWord = list[i];
  }

  return partial || byWord;
}

function findCharacterExact(query) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return null;
  const byId = load().characters[q] || load().characters[slugify(q)];
  if (byId) return byId;
  const { list, lowerNames } = catalog();
  const index = lowerNames.indexOf(q);
  return index === -1 ? null : list[index];
}

function getRandomCharacter() {
  const { list } = catalog();
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

function getSeriesList() {
  return [...catalog().bySeries.entries()]
    .map(([series, characters]) => ({ series, total: characters.length }))
    .sort((a, b) => a.series.localeCompare(b.series, "es", { sensitivity: "base" }));
}

function findSeries(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;
  const all = [...catalog().bySeries.keys()];
  const exact = all.find((s) => s.toLowerCase() === q);
  if (exact) return exact;
  const contains = all.find((s) => s.toLowerCase().includes(q));
  if (contains) return contains;
  const words = q.split(/\s+/).filter(Boolean);
  return all.find((s) => words.some((w) => s.toLowerCase().includes(w))) || null;
}

function getCharactersBySeries(series) {
  return catalog().bySeries.get(series) || [];
}

function getSeriesNameKeys(series) {
  return new Set(getCharactersBySeries(series).map((c) => normalizeCharacterKey(c.name)));
}

function getCachedTagKind(tag) {
  const entry = load().tagCache[tag];
  if (!entry) return null;
  const ttl = TAG_TTL_MS[entry.kind];
  if (!ttl || Date.now() - entry.checkedAt > ttl) return null;
  return entry.kind;
}

function setCachedTagKind(tag, kind) {
  load().tagCache[tag] = { kind, checkedAt: Date.now() };
  save();
}

function pruneTagCache() {
  const db = load();
  const limit = Date.now() - TAG_TTL_MS.other;
  let removed = false;
  for (const [tag, entry] of Object.entries(db.tagCache)) {
    if (entry.checkedAt < limit) {
      delete db.tagCache[tag];
      removed = true;
    }
  }
  if (removed) save();
}

function recordSeriesRun(seriesTag, seriesName, posts, added) {
  load().seriesRuns[seriesTag] = { seriesTag, seriesName, posts, added, processedAt: Date.now() };
  save();
}

function getSeriesRun(seriesTag) {
  return load().seriesRuns[seriesTag] || null;
}

function getRecentSeriesTags(withinMs) {
  const limit = Date.now() - withinMs;
  return new Set(
    Object.values(load().seriesRuns)
      .filter((run) => run.processedAt >= limit)
      .map((run) => run.seriesTag)
  );
}

function gachaUser(id) {
  const users = load().users;
  if (!users[id]) users[id] = { jid: "", lastRoll: 0, lastClaim: 0, primary: null };
  return users[id];
}

function touchUser(id, jid) {
  if (!id) return;
  const user = gachaUser(id);
  if (jid && user.jid !== jid) {
    user.jid = jid;
    save();
  }
}

function mentionJid(id) {
  return (load().users[id] && load().users[id].jid) || `${id}@s.whatsapp.net`;
}

function displayName(id) {
  const profile = pdb.peek(id);
  return (profile && profile.name && String(profile.name).trim()) || String(id);
}

function remaining(last, gap) {
  const ms = last + gap - Date.now();
  return { ready: ms <= 0, remainingMs: Math.max(ms, 0) };
}

function checkRollCooldown(id) {
  return remaining(gachaUser(id).lastRoll, ROLL_COOLDOWN_MS);
}

function setRollCooldown(id, timestamp) {
  gachaUser(id).lastRoll = timestamp;
  save();
}

function checkClaimCooldown(id) {
  return remaining(gachaUser(id).lastClaim, CLAIM_COOLDOWN_MS);
}

function setClaimCooldown(id, timestamp) {
  gachaUser(id).lastClaim = timestamp;
  save();
}

function getOwnership(characterId) {
  return load().owned[characterId] || null;
}

function getOwner(characterId) {
  const entry = getOwnership(characterId);
  return entry ? entry.owner : null;
}

function claimCharacter(characterId, id, timestamp) {
  const db = load();
  if (db.owned[characterId]) return false;
  db.owned[characterId] = { owner: id, claimedAt: timestamp };
  save();
  return true;
}

function clearPrimaryByCharacter(characterId) {
  for (const user of Object.values(load().users)) {
    if (user.primary === characterId) user.primary = null;
  }
}

function transferCharacter(characterId, id, timestamp) {
  const db = load();
  clearPrimaryByCharacter(characterId);
  delete db.market[characterId];
  db.owned[characterId] = { owner: id, claimedAt: timestamp };
  save();
}

function releaseCharacter(characterId) {
  const db = load();
  clearPrimaryByCharacter(characterId);
  delete db.market[characterId];
  delete db.owned[characterId];
  save();
}

function getUserCharacters(id) {
  const db = load();
  const result = [];
  for (const [characterId, entry] of Object.entries(db.owned)) {
    if (entry.owner !== id) continue;
    const character = db.characters[characterId];
    if (character) result.push({ ...character, claimedAt: entry.claimedAt });
  }
  return result.sort((a, b) => b.value - a.value);
}

function getPrimaryCharacter(id) {
  return gachaUser(id).primary || null;
}

function setPrimaryCharacter(id, characterId) {
  gachaUser(id).primary = characterId;
  save();
}

function clearPrimaryCharacter(id) {
  gachaUser(id).primary = null;
  save();
}

function getClaimedCount() {
  return Object.keys(load().owned).length;
}

function getPrimaryCounts() {
  const counts = new Map();
  for (const user of Object.values(load().users)) {
    if (user.primary) counts.set(user.primary, (counts.get(user.primary) || 0) + 1);
  }
  return [...counts.entries()].map(([characterId, total]) => ({ characterId, total })).sort((a, b) => b.total - a.total);
}

function resetAllClaims() {
  const db = load();
  const summary = { claims: Object.keys(db.owned).length, sales: Object.keys(db.market).length };
  db.owned = {};
  db.market = {};
  for (const user of Object.values(db.users)) {
    user.primary = null;
    user.lastRoll = 0;
    user.lastClaim = 0;
  }
  save();
  return summary;
}

function createBackup() {
  const dir = path.join(path.dirname(FILE), "backups");
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `gacha-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(target, JSON.stringify(load()));
  return target;
}

function collectHarem(ids) {
  const seen = new Map();
  for (const id of ids) {
    for (const character of getUserCharacters(id)) seen.set(character.id, character);
  }
  return [...seen.values()].sort((a, b) => b.value - a.value);
}

function moveHarem(oldIds, newId) {
  const sources = oldIds.filter((id) => id && id !== newId);
  const harem = collectHarem(sources);
  if (!harem.length) return { moved: [], totalValue: 0, favoriteKept: false };

  const db = load();
  const movedSet = new Set(harem.map((c) => c.id));
  let oldFavorite = null;
  for (const id of sources) {
    const user = db.users[id];
    if (!oldFavorite && user && user.primary) oldFavorite = user.primary;
  }
  const newHadFavorite = !!(db.users[newId] && db.users[newId].primary);

  const now = Date.now();
  for (const character of harem) transferCharacter(character.id, newId, character.claimedAt || now);

  let favoriteKept = false;
  if (oldFavorite && movedSet.has(oldFavorite) && !newHadFavorite) {
    setPrimaryCharacter(newId, oldFavorite);
    favoriteKept = true;
  }

  const totalValue = harem.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  return { moved: harem, totalValue, favoriteKept };
}

function createHaremRequest({ oldJid, oldIds, newId, chatId }) {
  const db = load();
  const id = Object.values(db.haremRequests).reduce((max, r) => Math.max(max, r.id), 0) + 1;
  db.haremRequests[id] = {
    id,
    oldJid,
    oldIds,
    newId,
    chatId,
    status: "pending",
    createdAt: Date.now(),
    resolvedAt: null,
    resolvedBy: null,
    movedCount: null,
    movedIds: null,
    note: null
  };
  save();
  return db.haremRequests[id];
}

function getHaremRequest(id) {
  return load().haremRequests[id] || null;
}

function getPendingHaremRequests(limit = 30) {
  return Object.values(load().haremRequests)
    .filter((r) => r.status === "pending")
    .sort((a, b) => a.id - b.id)
    .slice(0, limit);
}

function getPendingHaremRequestByNew(newId) {
  return Object.values(load().haremRequests).find((r) => r.status === "pending" && r.newId === newId) || null;
}

function resolveHaremRequest(id, status, { resolvedBy, movedCount = null, movedIds = null, note = null }) {
  const request = load().haremRequests[id];
  if (!request || request.status !== "pending") return null;
  Object.assign(request, { status, resolvedAt: Date.now(), resolvedBy, movedCount, movedIds, note });
  save();
  return request;
}

function recordRoll({ messageId, chatId, characterId, name, value, rolledBy }) {
  const db = load();
  const now = Date.now();
  for (const [key, roll] of Object.entries(db.rolls)) {
    if (now - roll.expiresAt > ROLL_KEEP_MS) delete db.rolls[key];
  }
  db.rolls[messageId] = {
    messageId,
    chatId,
    characterId,
    name,
    value,
    rolledBy,
    reservedUntil: now + ROLL_RESERVED_MS,
    expiresAt: now + ROLL_EXPIRES_MS,
    createdAt: now
  };
  save();
}

function getRoll(messageId) {
  return load().rolls[messageId] || null;
}

function todayKey(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function voteState(characterId) {
  const votes = load().votes;
  if (!votes[characterId]) votes[characterId] = { votes: 0, lastVotedAt: 0, voteDay: "", dayIncrement: 0 };
  return votes[characterId];
}

function getCharacterVoteStats(characterId) {
  return voteState(characterId);
}

function checkVoteCooldown(id) {
  return remaining(load().voteCooldowns[id] || 0, VOTE_COOLDOWN_MS);
}

function checkCharacterVoteCooldown(characterId) {
  return remaining(voteState(characterId).lastVotedAt, VOTE_COOLDOWN_MS);
}

function voteForCharacter(characterId, id, timestamp) {
  const db = load();
  const character = db.characters[characterId];
  if (!character) return null;

  const state = voteState(characterId);
  const today = todayKey(timestamp);
  const dayIncrement = state.voteDay === today ? state.dayIncrement : 0;
  const remainingCap = Math.max(VOTE_DAILY_CAP - dayIncrement, 0);
  if (remainingCap <= 0) return null;

  const increment = Math.min(remainingCap, randomInt(50, 250));
  character.value += increment;
  invalidate();

  state.votes += 1;
  state.lastVotedAt = timestamp;
  state.voteDay = today;
  state.dayIncrement = dayIncrement + increment;
  db.voteCooldowns[id] = timestamp;
  save();

  return { increment, newValue: character.value, votes: state.votes };
}

function getClaimMessage(id) {
  return load().claimMessages[id] || null;
}

function setClaimMessage(id, template) {
  load().claimMessages[id] = template;
  save();
}

function deleteClaimMessage(id) {
  delete load().claimMessages[id];
  save();
}

function renderClaimMessage(template, params) {
  return template.split("€user").join(params.user).split("€character").join(params.character);
}

function createSale(characterId, seller, price, timestamp) {
  load().market[characterId] = { characterId, seller, price, listedAt: timestamp };
  save();
}

function getSale(characterId) {
  return load().market[characterId] || null;
}

function deleteSale(characterId) {
  if (load().market[characterId]) {
    delete load().market[characterId];
    save();
  }
}

function withCharacter(sale) {
  const character = load().characters[sale.characterId];
  return character ? { ...sale, name: character.name, series: character.series, gender: character.gender, tag: character.tag, value: character.value } : null;
}

function getSaleByQuery(query) {
  const character = findCharacterExact(query);
  if (!character) return null;
  const sale = getSale(character.id);
  return sale ? withCharacter(sale) : null;
}

function getSales() {
  return Object.values(load().market)
    .map(withCharacter)
    .filter(Boolean)
    .sort((a, b) => b.listedAt - a.listedAt);
}

function findOwned(id, query) {
  const owned = getUserCharacters(id);
  const q = String(query || "").trim().toLowerCase();
  if (!q) return { owned, matches: [] };
  const byId = owned.filter((c) => c.id === q);
  if (byId.length) return { owned, matches: byId };
  const exact = owned.filter((c) => c.name.toLowerCase() === q);
  if (exact.length) return { owned, matches: exact };
  return { owned, matches: owned.filter((c) => c.name.toLowerCase().includes(q)) };
}

function ambiguousText(matches, query, usedPrefix, command) {
  const list = matches.map((c) => `» *${c.name}* \`${c.id}\``).join("\n");
  return `ꕥ Tienes *${matches.length}* personajes que coinciden con *${query}*. Usa el ID para elegir uno:\n\n${list}\n\n✐ Ejemplo: *${usedPrefix}${command} ${matches[0].id}*`;
}

function define({ commands, description, owner = false, mod = false, run }) {
  const handler = async (msg, ctx = {}) => {
    const sock = ctx.conn;
    const usedPrefix = ctx.usedPrefix || global.prefix || ".";
    const command = ctx.command || commands[0];
    try {
      const isOwner = pdb.isOwner(msg, ctx.sender);
      const denied = (text) => {
        console.log(`[auth] acceso denegado a ${command}: sender=${ctx.sender} participant=${msg.key.participant || ""} alt=${msg.key.participantAlt || ""} resuelto=${pdb.selfJid(msg)}`);
        return kit.reply(sock, msg, text);
      };
      if (owner && !isOwner) return denied("《✧》 Este comando solo puede usarlo el *owner* del bot.");
      if (mod && !pdb.isMod(msg, ctx.sender)) return denied("《✧》 Este comando solo puede usarlo un *mod* o el *owner* del bot.");
      const jid = pdb.selfJid(msg);
      const id = pdb.key(jid);
      touchUser(id, jid);
      const args = (ctx.args || []).filter(Boolean);
      return await run({
        sock,
        msg,
        ctx,
        chatId: msg.key.remoteJid,
        jid,
        id,
        args,
        text: args.join(" "),
        usedPrefix,
        command,
        isOwner
      });
    } catch (error) {
      console.error(error);
      return kit.reply(sock, msg, kit.errorText(usedPrefix, command, error));
    }
  };
  handler.command = commands;
  handler.description = description;
  handler.category = "Gacha";
  return handler;
}

function target(msg) {
  const t = pdb.mentionTarget(msg);
  if (!t) return null;
  const jid = t.jid || t.raw;
  return { jid, id: pdb.key(jid), raw: t.raw };
}

module.exports = {
  ROLL_COOLDOWN_MS,
  CLAIM_COOLDOWN_MS,
  VOTE_COOLDOWN_MS,
  SALE_TTL_MS,
  slugify,
  normalizeCharacterKey,
  randomValue,
  addCharacter,
  getCharacterById,
  getCharacterByTag,
  characterExists,
  countCharacters,
  getAllCharacters,
  getCharactersByValue,
  findCharacterByQuery,
  findCharacterExact,
  getRandomCharacter,
  getSeriesList,
  findSeries,
  getCharactersBySeries,
  getSeriesNameKeys,
  getCachedTagKind,
  setCachedTagKind,
  pruneTagCache,
  recordSeriesRun,
  getSeriesRun,
  getRecentSeriesTags,
  touchUser,
  mentionJid,
  displayName,
  checkRollCooldown,
  setRollCooldown,
  checkClaimCooldown,
  setClaimCooldown,
  getOwnership,
  getOwner,
  claimCharacter,
  transferCharacter,
  releaseCharacter,
  getUserCharacters,
  findOwned,
  ambiguousText,
  getPrimaryCharacter,
  setPrimaryCharacter,
  clearPrimaryCharacter,
  getClaimedCount,
  getPrimaryCounts,
  resetAllClaims,
  createBackup,
  collectHarem,
  moveHarem,
  createHaremRequest,
  getHaremRequest,
  getPendingHaremRequests,
  getPendingHaremRequestByNew,
  resolveHaremRequest,
  recordRoll,
  getRoll,
  getCharacterVoteStats,
  checkVoteCooldown,
  checkCharacterVoteCooldown,
  voteForCharacter,
  getClaimMessage,
  setClaimMessage,
  deleteClaimMessage,
  renderClaimMessage,
  createSale,
  getSale,
  deleteSale,
  getSaleByQuery,
  getSales,
  define,
  target,
  save,
  flush
};
