"use strict";

const axios = require("axios");

const BASE = "https://yande.re";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const MIN_INTERVAL_MS = Number(process.env.YANDERE_MIN_INTERVAL_MS) || 600;
const MAX_CONCURRENT = Number(process.env.YANDERE_MAX_CONCURRENT) || 3;
const DEFAULT_TIMEOUT_MS = Number(process.env.YANDERE_FETCH_TIMEOUT) || 12000;
const MAX_ATTEMPTS = 3;
const MAX_BLOCK_WAIT_MS = 20000;
const BACKOFF_BASE_MS = 2000;
const BACKOFF_CAP_MS = 5 * 60000;
const THROTTLE_STATUS = new Set([403, 429, 503]);
const POOL_TTL_MS = 5 * 60 * 1000;
const POOL_LIMIT = 100;
const POOL_MAX_ENTRIES = 400;

const BANNED_TAGS = /(loli|shota|child|toddler|infant)/;
const EXPLICIT_TAGS = /(\bnude\b|nudity|topless|no_bra|no_panties|underwear_aside|clothes_aside|breasts_out|exposed_breasts|\bnipples\b|areola|\bpussy\b|\bvagina\b|\bpenis\b|testicles|\banus\b|pubic_hair|cameltoe|\bsex\b|sexual_intercourse|masturbation|fellatio|cunnilingus|paizuri|handjob|footjob|penetration|spread_pussy|spread_anus|see[-_]?through|\bnaked\b|erection|ejaculation|\bcum\b|bukkake|creampie|futanari|\bguro\b|\brape\b|bondage|tentacle)/;
const ALLOWED_RATINGS = new Set(["s", "q"]);

class YandereError extends Error {
  constructor(message, kind, status) {
    super(message);
    this.name = "YandereError";
    this.kind = kind;
    this.status = status;
  }
}

const health = {
  ok: 0,
  failed: 0,
  consecutiveFails: 0,
  lastStatus: null,
  lastError: null,
  lastOkAt: 0,
  blockedUntil: 0,
  blockLevel: 0
};

let nextSlot = 0;
let active = 0;
const waiters = [];

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) return reject(new YandereError("aborted", "aborted"));
    const onAbort = () => {
      clearTimeout(timer);
      reject(new YandereError("aborted", "aborted"));
    };
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
  });
}

function throwIfAborted(signal) {
  if (signal && signal.aborted) throw new YandereError("aborted", "aborted");
}

function release() {
  const next = waiters.shift();
  if (next) next();
  else active--;
}

async function acquire(signal) {
  if (active < MAX_CONCURRENT) {
    active++;
    return;
  }
  await new Promise((resolve) => waiters.push(resolve));
  if (signal && signal.aborted) {
    release();
    throw new YandereError("aborted", "aborted");
  }
}

async function pace(signal) {
  const now = Date.now();
  const start = Math.max(now, nextSlot);
  nextSlot = start + MIN_INTERVAL_MS;
  if (start > now) await sleep(start - now, signal);
}

async function waitForBlock(signal) {
  const wait = health.blockedUntil - Date.now();
  if (wait <= 0) return;
  if (wait > MAX_BLOCK_WAIT_MS) {
    throw new YandereError(`yande.re limitó las peticiones (reintenta en ~${Math.ceil(wait / 1000)}s)`, "blocked");
  }
  await sleep(wait, signal);
}

function registerBlock(retryAfterHeader) {
  health.blockLevel = Math.min(health.blockLevel + 1, 8);
  const exponential = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** health.blockLevel);
  const retryAfter = Number(retryAfterHeader);
  const serverDelay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 0;
  health.blockedUntil = Date.now() + Math.max(exponential, serverDelay);
}

function recordSuccess() {
  health.ok++;
  health.consecutiveFails = 0;
  health.lastStatus = 200;
  health.lastError = null;
  health.lastOkAt = Date.now();
  health.blockLevel = 0;
}

function recordFailure(status, error) {
  health.failed++;
  health.consecutiveFails++;
  health.lastStatus = status || null;
  health.lastError = error && error.message ? error.message : String(error);
}

async function getJson(path, options = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    throwIfAborted(options.signal);
    await waitForBlock(options.signal);
    await pace(options.signal);
    await acquire(options.signal);

    try {
      const { data } = await axios.get(url, {
        headers: { "User-Agent": USER_AGENT },
        timeout: options.timeoutMs || DEFAULT_TIMEOUT_MS,
        signal: options.signal
      });
      recordSuccess();
      return data;
    } catch (error) {
      if (options.signal && options.signal.aborted) throw new YandereError("aborted", "aborted");

      const status = error && error.response ? error.response.status : undefined;
      recordFailure(status, error);

      if (status && THROTTLE_STATUS.has(status)) {
        registerBlock(error.response.headers && error.response.headers["retry-after"]);
        lastError = new YandereError(`HTTP ${status}`, "blocked", status);
        continue;
      }
      if (status && status < 500) throw new YandereError(`HTTP ${status}`, "http", status);

      lastError = new YandereError((error && error.message) || "Error de red", "network", status);
      await sleep(500 * attempt, options.signal);
    } finally {
      release();
    }
  }

  throw lastError || new YandereError("Error desconocido", "network");
}

function getHealth() {
  return {
    ok: health.ok,
    failed: health.failed,
    consecutiveFails: health.consecutiveFails,
    lastStatus: health.lastStatus,
    lastError: health.lastError,
    lastOkAt: health.lastOkAt,
    blockedForMs: Math.max(0, health.blockedUntil - Date.now()),
    blockLevel: health.blockLevel,
    inFlight: active,
    queued: waiters.length
  };
}

function isSafePost(post) {
  if (!post || !ALLOWED_RATINGS.has(post.rating)) return false;
  const tags = String(post.tags || "").toLowerCase();
  if (BANNED_TAGS.test(tags)) return false;
  if (EXPLICIT_TAGS.test(tags)) return false;
  return true;
}

const poolCache = new Map();
const poolInflight = new Map();

function prunePools() {
  const now = Date.now();
  for (const [key, entry] of poolCache) {
    if (now - entry.at >= POOL_TTL_MS) poolCache.delete(key);
  }
  while (poolCache.size > POOL_MAX_ENTRIES) poolCache.delete(poolCache.keys().next().value);
}

function fetchPool(key) {
  const cached = poolCache.get(key);
  if (cached && Date.now() - cached.at < POOL_TTL_MS) return Promise.resolve(cached.data);

  const pending = poolInflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const posts = await getJson(`/post.json?limit=${POOL_LIMIT}&page=1&tags=${encodeURIComponent(key)}`);
      if (!Array.isArray(posts) || !posts.length) return null;
      const filtered = posts.filter(isSafePost);
      prunePools();
      poolCache.set(key, { data: filtered, at: Date.now() });
      return filtered.length ? filtered : null;
    } catch {
      return null;
    } finally {
      poolInflight.delete(key);
    }
  })();

  poolInflight.set(key, promise);
  return promise;
}

async function resolvePool(tag) {
  const clean = tag.trim().toLowerCase().replace(/\s+/g, "_");
  const base = clean.includes("_(") ? clean.split("_(")[0] : null;

  const [exact, fallback] = await Promise.all([fetchPool(clean), base ? fetchPool(base) : Promise.resolve(null)]);

  if (exact && exact.length >= 3) return exact;
  if (exact && exact.length) {
    if (!fallback || !fallback.length) return exact;
    const seen = new Set(exact.map((p) => p.id));
    return [...exact, ...fallback.filter((p) => !seen.has(p.id))];
  }
  return fallback || null;
}

async function getRandomPost(tag, filter) {
  try {
    if (!tag || typeof tag !== "string") return null;
    const pool = await resolvePool(tag);
    if (!pool || !pool.length) return null;

    const usable = pool.filter((p) => {
      if (!(p.sample_url || p.jpeg_url || p.file_url)) return false;
      if (!filter) return true;
      return (p.width || 0) >= (filter.minWidth || 0) && (p.height || 0) >= (filter.minHeight || 0);
    });
    if (!usable.length) return null;

    const post = usable[Math.floor(Math.random() * usable.length)];
    return {
      id: post.id,
      url: post.sample_url || post.jpeg_url || post.file_url,
      tags: post.tags || "",
      rating: post.rating || "s",
      width: post.width || 0,
      height: post.height || 0
    };
  } catch {
    return null;
  }
}

async function getRandomUrl(tag, filter) {
  const post = await getRandomPost(tag, filter);
  return post ? post.url : null;
}

function clearCache() {
  poolCache.clear();
  poolInflight.clear();
}

module.exports = {
  YandereError,
  getJson,
  getHealth,
  isSafePost,
  getRandomPost,
  getRandomUrl,
  clearCache,
  sleep,
  BANNED_TAGS
};
