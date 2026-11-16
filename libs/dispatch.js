"use strict";

const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const botconf = require("./botconf");
const kit = require("./pluginkit");
const lid = require("./lid");
const groupHooks = require("./grouphooks");

const LISTA = path.resolve(__dirname, "..", "src", "lista.json");
const STALE_MS = 15000;
const PEEL = ["ephemeralMessage", "viewOnceMessage", "viewOnceMessageV2", "viewOnceMessageV2Extension", "documentWithCaptionMessage"];

const getMain = () => require("../main");

let lista = { at: 0, ids: new Set() };

function isAllowedUser(sender) {
  const now = Date.now();
  if (now - lista.at > 15000) {
    lista.at = now;
    try {
      const raw = JSON.parse(fs.readFileSync(LISTA, "utf-8"));
      lista.ids = new Set((Array.isArray(raw) ? raw : []).map(String));
    } catch {
      lista.ids = new Set();
    }
  }
  return lista.ids.has(String(sender || "").replace(/\D/g, ""));
}

function peel(message) {
  let current = message;
  for (let i = 0; i < 5 && current; i++) {
    const key = PEEL.find((name) => current[name]?.message);
    if (!key) break;
    current = current[key].message;
  }
  return current || null;
}

function timestampMs(value) {
  if (!value) return 0;
  const n = typeof value === "object" ? (typeof value.toNumber === "function" ? value.toNumber() : Number(value.low)) : Number(value);
  return Number.isFinite(n) ? n * 1000 : 0;
}

function tag(bot, id) {
  return bot.isMain ? chalk.green(`main:${id}`) : chalk.magenta(`sub:${id}`);
}

async function senderIds(sock, msg, sender) {
  const ids = [sender, botconf.number(msg.key.participantAlt), botconf.number(msg.key.remoteJidAlt)];
  const raw = msg.key.participant || msg.key.remoteJid;
  if (lid.isLid(raw)) {
    const resolved = await lid.resolve(sock, raw, msg).catch(() => null);
    ids.push(botconf.number(resolved));
  }
  return ids.filter(Boolean);
}

async function handle(sock, msg, bot) {
  const chatId = msg?.key?.remoteJid;
  if (!chatId || chatId === "status@broadcast" || chatId.endsWith("@broadcast") || chatId.endsWith("@newsletter")) return;

  lid.learn(msg);

  const botNumber = botconf.number(sock.user?.id);
  if (!botNumber) return;
  const isGroup = chatId.endsWith("@g.us");
  const rawSender = botconf.number(msg.key.participant || chatId);
  const keyFromMe = !!msg.key.fromMe;
  const fromMe = keyFromMe || rawSender === botNumber;
  const sender = !bot.isMain && keyFromMe ? botNumber : rawSender;

  if (!msg.message) {
    const cipher = global.wa?.proto?.WebMessageInfo?.StubType?.CIPHERTEXT;
    if (cipher !== undefined && msg.messageStubType === cipher) {
      console.log(chalk.red(`⚠️ No se pudo descifrar un mensaje de ${sender}: ${(msg.messageStubParameters || []).join(" ")}`));
    }
    return;
  }

  if (!bot.isMain && timestampMs(msg.messageTimestamp) && timestampMs(msg.messageTimestamp) < (bot.bootTime || 0) - STALE_MS) return;

  const content = peel(msg.message);
  const text = kit.getText(content);
  const messageType = Object.keys(content || {})[0];
  const settings = botconf.get(botNumber);
  const matched = botconf.match(botNumber, text);

  if (bot.isMain || matched) {
    console.log(chalk.yellow("\n📩 Nuevo mensaje recibido"));
    console.log(chalk.green(`🤖 Bot: ${tag(bot, botNumber)}`));
    console.log(chalk.green(`📨 De: ${fromMe ? "[Tú]" : "[Usuario]"} ${chalk.bold(sender)}`));
    console.log(chalk.cyan(`💬 Tipo: ${messageType}`));
    console.log(chalk.cyan(`💬 Mensaje: ${chalk.bold(text || "📂 (Mensaje multimedia)")}`));
    console.log(chalk.gray("──────────────────────────"));
  }

  if (!isGroup && bot.isMain && !fromMe && !isAllowedUser(sender)) {
    const ownerDm = await lid.isListed(sock, msg, global.owner, [sender]).catch(() => false);
    if (!ownerDm) return;
  }

  let isHandler = true;
  if (isGroup) {
    const elected = await botconf.elect(sock, chatId, botNumber).catch(() => null);
    isHandler = elected === null || elected === botNumber;
  }

  if (isGroup && !fromMe && isHandler) await groupHooks.onMessage(sock, msg, text).catch(() => null);

  if (!matched) return;
  const body = matched.body.trim();
  const command = body.split(/\s+/)[0] || "";
  if (!command) return;
  const lower = command.toLowerCase();
  const mainModule = getMain();
  if (!mainModule.hasCommand(lower)) return;

  if (botconf.SOCKET_CMDS.has(lower) && sender !== botNumber && botconf.isLive(sender)) return;

  const ids = await senderIds(sock, msg, sender);
  const isOwnerSender = await lid.isListed(sock, msg, global.owner, ids).catch(() => false);
  const isModSender = isOwnerSender || (await lid.isListed(sock, msg, global.mods, ids).catch(() => false));
  let role = botconf.role({ id: botNumber }, ids, fromMe);
  if (role === "none" && isOwnerSender) role = "global";

  if (settings.self && role === "none") return;
  if (!isGroup && !bot.isMain && role === "none" && !isAllowedUser(sender) && !botconf.PRIVATE_OPEN.has(lower)) return;
  if (isGroup && !isHandler && !(botconf.isSpecific(role) && botconf.SOCKET_CMDS.has(lower))) return;

  const args = body.slice(command.length).trim().split(" ");
  if (isGroup && !(await groupHooks.allowCommand(sock, msg, lower, sender).catch(() => true))) return;

  msg.__sub = !bot.isMain;
  msg.__role = role;
  msg.__owner = isOwnerSender;
  msg.__mod = isModSender;

  const extra = {
    usedPrefix: matched.prefix,
    isMain: !!bot.isMain,
    isSub: !bot.isMain,
    role,
    botId: botNumber,
    settings
  };

  mainModule.handleCommand(sock, msg, command, args, sender, extra).catch((error) => console.error(chalk.red("❌ Error ejecutando comando:"), error));
}

async function onUpsert(sock, upsert, bot) {
  if (!bot.isMain && upsert?.type !== "notify") return;
  const messages = upsert?.messages || [];
  for (const msg of messages) {
    handle(sock, msg, bot).catch((error) => console.error(chalk.red("❌ Error en messages.upsert:"), error));
  }
}

async function onParticipants(sock, update, bot) {
  const chatId = update?.id;
  if (!chatId || !chatId.endsWith("@g.us")) return;
  botconf.invalidate(chatId);
  const id = botconf.number(sock.user?.id);
  const elected = await botconf.elect(sock, chatId, id).catch(() => null);
  if (elected !== null && elected !== id) return;
  await groupHooks.onParticipants(sock, update).catch(() => null);
}

module.exports = { onUpsert, onParticipants, isAllowedUser };
