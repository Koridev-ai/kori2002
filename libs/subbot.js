"use strict";

const fs = require("fs");
const path = require("path");
const pino = require("pino");
const chalk = require("chalk");
const botconf = require("./botconf");
const dispatch = require("./dispatch");
const botmedia = require("./botmedia");

const ROOT = path.resolve(__dirname, "..");
const SUBS_DIR = path.join(ROOT, "sessions_subs");
const PAIR_TIMEOUT = 3 * 60 * 1000;
const BOOT_INTERVAL = 60 * 1000;
const BOOT_GAP = 2500;
const MSG_LIMIT = 500;
const COOLDOWN = 80 * 1000;
const MAX_FAILURES = 5;
const MAX_QR = 5;
const MAX_CODE_TRIES = 3;
const DELETE_AFTER = 60 * 1000;

const silentLogger = pino({ level: "silent" });
const errorLogger = pino({ level: "error" });

const subs = new Map();
const booting = new Set();
const failures = new Map();
const cooldowns = new Map();
let started = false;
let waModule = null;

if (!global.conns) global.conns = [];

const loadWa = () => {
  if (!waModule) waModule = import("baileys");
  return waModule;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const limit = () => Number(global.subLimit) || 50;
const folderOf = (id) => path.join(SUBS_DIR, id);

function normalizePhone(input) {
  let digits = String(input || "").replace(/\D/g, "");
  digits = digits.replace(/^0+/, "");
  return digits;
}

function isValidPhone(value) {
  return /^\d{8,15}$/.test(value);
}

function cooldownLeft(sender) {
  const last = cooldowns.get(String(sender)) || 0;
  return Math.max(0, last + COOLDOWN - Date.now());
}

function markCooldown(sender) {
  cooldowns.set(String(sender), Date.now());
  if (cooldowns.size > 500) cooldowns.delete(cooldowns.keys().next().value);
}

function removeConn(entry) {
  const conns = global.conns;
  for (let i = conns.length - 1; i >= 0; i--) {
    const conn = conns[i];
    if (conn === entry.sock || (entry.userId && conn.userId === entry.userId)) conns.splice(i, 1);
  }
}

function teardown(entry, { remove = false } = {}) {
  entry.stopping = true;
  clearTimeout(entry.pairing.timer);
  try {
    entry.resilient?.stop();
  } catch {}
  try {
    entry.sock?.ev?.removeAllListeners?.();
  } catch {}
  if (subs.get(entry.id) === entry) subs.delete(entry.id);
  if (entry.userId) botconf.unregister(entry.userId);
  removeConn(entry);
  entry.status = "stopped";
  if (remove) {
    const key = entry.userId || entry.id;
    botmedia.removeAll(key);
    botconf.remove(key);
    try {
      fs.rmSync(entry.folder, { recursive: true, force: true });
    } catch (error) {
      console.error(chalk.red(`❌ No se pudo eliminar ${entry.folder}:`), error.message);
    }
  }
}

function findEntry(value) {
  const key = botconf.number(value);
  if (!key) return null;
  if (subs.has(key)) return subs.get(key);
  for (const entry of subs.values()) if (entry.userId === key) return entry;
  return null;
}

async function stopSub(value, { remove = false } = {}) {
  const entry = findEntry(value);
  if (!entry) {
    const key = botconf.number(value);
    if (remove && key && fs.existsSync(folderOf(key))) {
      fs.rmSync(folderOf(key), { recursive: true, force: true });
      botmedia.removeAll(key);
      botconf.remove(key);
      return true;
    }
    return false;
  }
  teardown(entry, { remove });
  return true;
}

function send(entry, content) {
  const target = entry.notify;
  if (!target) return Promise.resolve(null);
  const sock = target.sock?.user ? target.sock : global.mainSock;
  if (!sock) return Promise.resolve(null);
  return sock.sendMessage(target.chatId, content, target.quoted ? { quoted: target.quoted } : undefined).catch(() => null);
}

const say = (entry, text) => send(entry, { text });

function scheduleDelete(entry, sent) {
  if (!sent?.key || !entry.notify) return;
  const timer = setTimeout(() => {
    const sock = entry.notify.sock?.user ? entry.notify.sock : global.mainSock;
    sock?.sendMessage(entry.notify.chatId, { delete: sent.key }).catch(() => null);
  }, DELETE_AFTER);
  if (timer.unref) timer.unref();
}

const CODE_CAPTION =
  "`✤` Vincula tu *cuenta* usando el *código.*\n\n> ✥ Sigue las *instrucciones*\n\n*›* Click en los *3 puntos*\n*›* Toque *dispositivos vinculados*\n*›* Vincular *nuevo dispositivo*\n*›* Selecciona *Vincular con el número de teléfono*\n\nꕤ *`Importante`*\n> ₊·( 🜸 ) ➭ Este *código* solo funciona en el *número que lo solicitó*";

const QR_CAPTION =
  "`✤` Vincula tu *cuenta* usando *código QR.*\n\n> ✥ Sigue las *instrucciones*\n\n*›* Click en los *3 puntos*\n*›* Toque *dispositivos vinculados*\n*›* Vincular *nuevo dispositivo*\n*›* Escanea el código *QR.*\n\n> ₊·( 🜸 ) ➭ Recuerda que no es recomendable usar tu cuenta principal para registrar un socket.";

async function handlePairing(entry, wa, sock, qr) {
  if (entry.mode === "code") {
    if (entry.pairing.requested) return;
    entry.pairing.requested = true;
    try {
      const raw = await sock.requestPairingCode(entry.id);
      const code = typeof wa.formatPairingCode === "function" ? wa.formatPairingCode(raw) : (String(raw).match(/.{1,4}/g) || [raw]).join("-");
      const first = await say(entry, CODE_CAPTION);
      const second = await say(entry, code);
      scheduleDelete(entry, first);
      scheduleDelete(entry, second);
    } catch (error) {
      entry.pairing.requested = false;
      entry.pairing.tries++;
      const limited = typeof wa.isRateLimitError === "function" && wa.isRateLimitError(error);
      if (limited || entry.pairing.tries >= MAX_CODE_TRIES) {
        await say(entry, limited ? "⏳ WhatsApp limitó los códigos de vinculación. Espera unos minutos e inténtalo de nuevo." : `《✧》 No se pudo generar el código de vinculación.\n> [Error: *${error?.message || error}*]`);
        teardown(entry, { remove: true });
      }
    }
    return;
  }

  if (entry.mode === "qr") {
    if (entry.pairing.qrSent >= MAX_QR) return;
    let image;
    try {
      image = await require("qrcode").toBuffer(qr, { scale: 8 });
    } catch (error) {
      await say(entry, `《✧》 No se pudo generar el código QR.\n> Instala la dependencia con *npm install qrcode*.\n> [Error: *${error?.message || error}*]`);
      teardown(entry, { remove: true });
      return;
    }
    entry.pairing.qrSent++;
    if (entry.pairing.lastQr && entry.notify) {
      const previous = entry.pairing.lastQr;
      const target = entry.notify.sock?.user ? entry.notify.sock : global.mainSock;
      target?.sendMessage(entry.notify.chatId, { delete: previous.key }).catch(() => null);
    }
    const sent = await send(entry, { image, caption: QR_CAPTION });
    entry.pairing.lastQr = sent;
  }
}

async function onOpen(entry, sock) {
  const userId = botconf.number(sock.user?.id);
  const mainId = botconf.number(global.mainSock?.user?.id);
  const duplicate = [...subs.values()].some((other) => other !== entry && other.userId === userId);
  if (!userId || userId === mainId || duplicate) {
    await say(entry, userId === mainId ? "《✧》 No puedes vincular el número del bot principal como Sub-Bot." : "《✧》 Este número ya está vinculado como Sub-Bot.");
    teardown(entry, { remove: entry.fresh });
    return;
  }

  entry.opened = true;
  entry.status = "open";
  entry.bootTime = Date.now();
  entry.connectedAt = Date.now();
  entry.userId = userId;
  clearTimeout(entry.pairing.timer);
  failures.delete(entry.id);

  sock.userId = userId;
  removeConn(entry);
  global.conns.push(sock);

  botconf.get(userId);
  botconf.set(userId, "type", "Sub");
  botconf.register(userId, { isMain: false, getSock: () => entry.sock });
  botconf.setOnline(userId, true);

  console.log(chalk.green(`✅ SUB-BOT conectado: ${userId}`));

  if (entry.fresh && !entry.announced) {
    entry.announced = true;
    await say(entry, "✎ Has conectado un nuevo Socket de tipo *Sub*.");
  }
}

function onClose(entry) {
  if (!entry.opened) {
    entry.status = "connecting";
    return;
  }
  entry.status = "reconnecting";
  if (entry.userId) botconf.setOnline(entry.userId, false);
  removeConn(entry);
}

async function startSub({ number, mode = null, notify = null }) {
  const id = normalizePhone(number);
  if (!isValidPhone(id)) throw new Error("Número inválido. Usa el formato internacional sin símbolos, por ejemplo 573001234567.");

  const mainId = botconf.number(global.mainSock?.user?.id);
  if (mainId && id === mainId) throw new Error("No puedes usar el número del bot principal como Sub-Bot.");

  const existing = subs.get(id);
  if (existing) {
    if (existing.status === "open") throw new Error("Este número ya tiene un Sub-Bot activo.");
    teardown(existing, { remove: false });
  }
  if (subs.size >= limit()) throw new Error("No se han encontrado espacios disponibles para registrar un Sub-Bot.");

  fs.mkdirSync(SUBS_DIR, { recursive: true });
  const folder = folderOf(id);
  const wa = await loadWa();
  const { state, saveCreds } = await wa.useMultiFileAuthState(folder);
  const fresh = !state.creds.registered;

  if (fresh && !mode) {
    fs.rmSync(folder, { recursive: true, force: true });
    throw new Error("La sesión de este Sub-Bot no está vinculada.");
  }

  const entry = {
    id,
    folder,
    mode: fresh ? mode : null,
    notify: fresh ? notify : null,
    fresh,
    status: "starting",
    opened: false,
    stopping: false,
    announced: false,
    userId: null,
    startedAt: Date.now(),
    connectedAt: 0,
    bootTime: Date.now(),
    resilient: null,
    sock: null,
    store: new Map(),
    pairing: { requested: false, tries: 0, qrSent: 0, lastQr: null, timer: null },
    bot: null
  };
  entry.bot = {
    isMain: false,
    get id() {
      return entry.userId || entry.id;
    },
    get bootTime() {
      return entry.bootTime;
    }
  };

  const config = {
    logger: errorLogger,
    auth: { creds: state.creds, keys: wa.makeCacheableSignalKeyStore(state.keys, silentLogger) },
    browser: entry.mode === "qr" ? wa.Browsers.macOS("Safari") : wa.Browsers.ubuntu("Chrome"),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    getMessage: async (key) => entry.store.get(`${key.remoteJid}:${key.id}`)
  };

  const bind = (sock) => {
    entry.sock = sock;
    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("messages.upsert", (upsert) => {
      for (const message of upsert?.messages || []) {
        if (message?.message && message.key?.id) {
          entry.store.set(`${message.key.remoteJid}:${message.key.id}`, message.message);
          if (entry.store.size > MSG_LIMIT) entry.store.delete(entry.store.keys().next().value);
        }
      }
      if (!entry.opened || entry.stopping) return;
      dispatch.onUpsert(sock, upsert, entry.bot).catch((error) => console.error(chalk.red("❌ Error Sub-Bot:"), error?.message || error));
    });
    sock.ev.on("group-participants.update", (update) => {
      if (!entry.opened || entry.stopping) return;
      dispatch.onParticipants(sock, update, entry.bot).catch(() => null);
    });
    sock.ev.on("connection.update", async (update) => {
      if (entry.stopping) return;
      try {
        if (update.qr && !state.creds.registered) await handlePairing(entry, wa, sock, update.qr);
        if (update.connection === "connecting" && entry.opened) entry.status = "reconnecting";
        if (update.connection === "open") await onOpen(entry, sock);
        if (update.connection === "close") onClose(entry);
      } catch (error) {
        console.error(chalk.red(`❌ Error en conexión del Sub-Bot ${entry.id}:`), error?.message || error);
      }
    });
  };

  const giveUp = (statusCode) => {
    if (entry.stopping) return;
    const loggedOut = statusCode === wa.DisconnectReason.loggedOut;
    console.log(chalk.red(loggedOut ? `❌ SUB-BOT ${entry.id}: sesión cerrada, se eliminó la sesión.` : `❌ SUB-BOT ${entry.id}: reconexión detenida (código ${statusCode}).`));
    if (!loggedOut) failures.set(entry.id, (failures.get(entry.id) || 0) + 1);
    teardown(entry, { remove: loggedOut });
  };

  subs.set(id, entry);

  if (entry.fresh) {
    entry.pairing.timer = setTimeout(() => {
      if (entry.opened || entry.stopping) return;
      say(entry, "⏳ Se agotó el tiempo para vincular el Sub-Bot. Vuelve a intentarlo.");
      teardown(entry, { remove: true });
    }, PAIR_TIMEOUT);
    if (entry.pairing.timer.unref) entry.pairing.timer.unref();
  }

  try {
    entry.resilient = wa.makeResilientSocket({
      config,
      logger: errorLogger,
      minDelayMs: 3000,
      maxDelayMs: 60000,
      shouldReconnect: (statusCode) => statusCode !== wa.DisconnectReason.loggedOut,
      onSocket: bind,
      onStopped: giveUp,
      onMaxAttemptsReached: () => giveUp(undefined)
    });
  } catch (error) {
    teardown(entry, { remove: entry.fresh });
    throw error;
  }

  return entry;
}

async function boot() {
  if (!fs.existsSync(SUBS_DIR)) return;
  let names;
  try {
    names = fs.readdirSync(SUBS_DIR);
  } catch {
    return;
  }
  for (const name of names) {
    if (!/^\d{8,15}$/.test(name)) continue;
    const credsFile = path.join(SUBS_DIR, name, "creds.json");
    if (!fs.existsSync(credsFile)) continue;
    if (subs.has(name) || booting.has(name)) continue;
    if ((failures.get(name) || 0) >= MAX_FAILURES) continue;
    let creds;
    try {
      creds = JSON.parse(fs.readFileSync(credsFile, "utf-8"));
    } catch {
      continue;
    }
    if (!creds.registered) {
      try {
        fs.rmSync(path.join(SUBS_DIR, name), { recursive: true, force: true });
      } catch {}
      continue;
    }
    booting.add(name);
    try {
      await startSub({ number: name });
    } catch (error) {
      console.log(chalk.red(`❌ No se pudo iniciar el Sub-Bot ${name}: ${error?.message || error}`));
    } finally {
      booting.delete(name);
    }
    await sleep(BOOT_GAP);
  }
}

function start() {
  if (started) return;
  started = true;
  const tick = async () => {
    try {
      await boot();
    } catch (error) {
      console.error(chalk.red("❌ Error cargando Sub-Bots:"), error?.message || error);
    } finally {
      const timer = setTimeout(tick, BOOT_INTERVAL);
      if (timer.unref) timer.unref();
    }
  };
  tick();
}

function savedSessions() {
  if (!fs.existsSync(SUBS_DIR)) return [];
  return fs
    .readdirSync(SUBS_DIR, { withFileTypes: true })
    .filter((dir) => dir.isDirectory() && /^\d{8,15}$/.test(dir.name) && fs.existsSync(path.join(SUBS_DIR, dir.name, "creds.json")))
    .map((dir) => dir.name);
}

function list() {
  return [...subs.values()].map((entry) => ({
    id: entry.id,
    userId: entry.userId || entry.id,
    status: entry.status,
    connectedAt: entry.connectedAt,
    sock: entry.sock
  }));
}

function activeCount() {
  return [...subs.values()].filter((entry) => entry.status === "open").length;
}

module.exports = {
  SUBS_DIR,
  normalizePhone,
  isValidPhone,
  cooldownLeft,
  markCooldown,
  startSub,
  stopSub,
  findEntry,
  start,
  boot,
  list,
  activeCount,
  savedSessions,
  limit
};
