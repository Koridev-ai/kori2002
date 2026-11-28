"use strict";

const kit = require("../../libs/pluginkit");
const lid = require("../../libs/lid");
const gk = require("../../libs/groupkit");
const db = require("../../libs/groupdb");
const botconf = require("../../libs/botconf");

const NONE = "—";
const LOOKUP_CHUNK = 25;
const LOOKUP_LIMIT = 200;
const LIST_LIMIT = 15;
const WEEK_MS = 7 * 86400000;

const code = (value) => (value === null || value === undefined || value === "" ? NONE : `\`${value}\``);
const flag = (value) => (value ? "✓" : "✗");
const state = (value) => (value ? "✓ Activado" : "✗ Desactivado");

async function attempt(fn) {
  try {
    return await fn();
  } catch {
    return null;
  }
}

function pnOf(participant) {
  const pn = [participant.phoneNumber, participant.jid, participant.id].find((value) => value && lid.isPn(value));
  return pn ? lid.user(pn) : null;
}

async function storePn(sock, participant) {
  const store = sock?.signalRepository?.lidMapping;
  if (!store) return null;
  const target = lid.toLid(participant.lid || participant.id);
  if (!target) return null;
  const cached = await attempt(() => store.phoneCache?.getPhoneForLid?.(target));
  if (cached && !lid.isLid(cached)) return lid.user(cached);
  const stored = await attempt(() => store.getPNForLID?.(target));
  if (stored && !lid.isLid(stored)) return lid.user(stored);
  return null;
}

async function analyzeParticipants(sock, participants) {
  const withNumber = [];
  const pending = [];
  for (const participant of participants) {
    const pn = pnOf(participant);
    if (pn) withNumber.push({ participant, number: pn, via: "metadata" });
    else pending.push(participant);
  }

  const checked = pending.slice(0, LOOKUP_LIMIT);
  const skipped = pending.length - checked.length;
  const resolved = [];
  const unresolved = [];

  for (let i = 0; i < checked.length; i += LOOKUP_CHUNK) {
    const chunk = checked.slice(i, i + LOOKUP_CHUNK);
    const numbers = await Promise.all(chunk.map((participant) => storePn(sock, participant)));
    chunk.forEach((participant, index) => {
      if (numbers[index]) resolved.push({ participant, number: numbers[index], via: "store" });
      else unresolved.push(participant);
    });
  }

  return { withNumber, resolved, unresolved, skipped };
}

function trackingStats(chat, participants, analysis) {
  const users = chat.users || {};
  const known = new Set(Object.keys(users));
  const numbers = new Map();
  for (const item of [...analysis.withNumber, ...analysis.resolved]) numbers.set(item.participant, item.number);

  const matched = new Set();
  let tracked = 0;
  let recent = 0;
  const now = Date.now();

  for (const participant of participants) {
    const ids = [...gk.idsOf(participant), numbers.get(participant)].filter(Boolean);
    const hit = ids.find((id) => known.has(id));
    if (!hit) continue;
    tracked++;
    matched.add(hit);
    if (now - (users[hit].last || 0) < WEEK_MS) recent++;
  }

  return { tracked, recent, orphans: known.size - matched.size, total: known.size };
}

function diagnose(info) {
  const issues = [];
  if (!info.meta) {
    issues.push("No se pudo leer la metadata del grupo (`groupMetadata` falló). Sin ella el bot no detecta a nadie. Reintenta en unos segundos o reinicia el socket.");
    return issues;
  }
  if (!info.participants.length) issues.push("La metadata no trae participantes.");
  if (!info.g.bot) issues.push("El bot no se encuentra en la lista de participantes, por eso no detecta si es admin.");
  if (!info.g.me) issues.push("Tu usuario no aparece en los participantes del grupo.");
  if (info.chat.disabled) issues.push("El bot está *desactivado* en este grupo (`bot off`). Solo owner o admins con `bot on` pueden reactivarlo.");
  if (info.chat.adminonly) issues.push("El modo *Solo Admin* está activo: los miembros no pueden usar comandos.");
  if (info.settings.self) issues.push("Este bot está en modo *self*: solo responde a su dueño.");
  if (info.elected !== null && info.elected !== info.botNumber) issues.push(`Otro bot (${code(info.elected)}) fue elegido para manejar este grupo, este no responde.`);
  if (info.analysis.unresolved.length) issues.push(`${info.analysis.unresolved.length} participante(s) con LID sin número resoluble. Esos usuarios solo se detectan por LID hasta que escriban en el chat.`);
  if (info.participants.length && !info.tracking.tracked) issues.push("Ningún participante tiene actividad registrada: el hook de mensajes no está guardando usuarios en este grupo.");
  if (!issues.length) issues.push("Todo en orden: el bot ve el grupo, a sus participantes y puede atender comandos.");
  return issues;
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "gpcheck";

  try {
    const isOwner = (msg.key.fromMe && !ctx.isSub) || msg.__owner || (await gk.ownerCheck(sock, msg, ctx.sender));
    if (!isOwner) return kit.reply(sock, msg, "《✧》 Este comando es solo para el owner.");

    const chatId = msg.key.remoteJid;
    if (!chatId.endsWith("@g.us")) return kit.reply(sock, msg, "《✧》 Este comando solo puede usarse en grupos.");

    const botNumber = botconf.number(sock.user?.id);
    const started = Date.now();
    const g = await gk.context(sock, msg);
    const metaMs = Date.now() - started;
    const meta = g.meta || null;
    const participants = g.participants || [];
    const chat = db.chat(chatId);
    const settings = botconf.get(botNumber);
    const elected = await attempt(() => botconf.elect(sock, chatId, botNumber));
    const present = (await attempt(() => botconf.candidatesIn(sock, chatId, botNumber))) || [];
    const analysis = await analyzeParticipants(sock, participants);
    const tracking = trackingStats(chat, participants, analysis);
    const admins = participants.filter(gk.isAdminP).length;
    const wantList = (ctx.args || []).some((arg) => String(arg).toLowerCase() === "lista");

    const info = { meta, g, participants, chat, settings, elected, botNumber, analysis, tracking };

    const out = [];
    out.push("「✧」 *Chequeo del grupo*");
    out.push("");
    out.push("➭ *Grupo*");
    out.push(`◇ *Nombre ›* ${code(meta?.subject)}`);
    out.push(`◇ *ID ›* ${code(chatId)}`);
    out.push(`◇ *Metadata ›* ${flag(meta)} (${metaMs} ms)`);
    out.push(`◇ *Participantes ›* ${participants.length} · admins ${admins}`);
    out.push(`◇ *Modo de direcciones ›* ${code(meta?.addressingMode)}`);
    out.push(`◇ *Solo admins escriben ›* ${flag(meta?.announce)}`);
    out.push("");
    out.push("➭ *Estado en este grupo*");
    out.push(`◇ *Bot ›* ${state(!chat.disabled)}`);
    out.push(`◇ *Solo Admin ›* ${state(chat.adminonly)}`);
    out.push(`◇ *AntiEnlace ›* ${state(chat.antilinks)}`);
    out.push(`◇ *Bienvenida ›* ${state(chat.welcome)}`);
    out.push(`◇ *Despedida ›* ${state(chat.goodbye)}`);
    out.push(`◇ *Alertas ›* ${state(chat.alerts)}`);
    out.push(`◇ *Economía ›* ${state(chat.economy)}`);
    out.push(`◇ *Modo self del bot ›* ${state(settings.self)}`);
    out.push("");
    out.push("➭ *Bots y manejador*");
    out.push(`◇ *Este bot ›* ${code(botNumber)} · LID ${code(botconf.number(sock.user?.lid))}`);
    out.push(`◇ *Bot en participantes ›* ${flag(g.bot)} · admin ${flag(g.isBotAdmin)}`);
    out.push(`◇ *Bots presentes ›* ${present.length ? present.map((b) => code(b.id)).join(", ") : NONE}`);
    out.push(`◇ *Primario fijado ›* ${code(botconf.primaryOf(chatId))}`);
    out.push(`◇ *Manejador elegido ›* ${code(elected)} ${flag(elected === null || elected === botNumber)} ${elected === null || elected === botNumber ? "este bot responde" : "responde otro bot"}`);
    out.push("");
    out.push("➭ *Detección de usuarios*");
    out.push(`◇ *Con número en metadata ›* ${analysis.withNumber.length}`);
    out.push(`◇ *LID resuelto por store ›* ${analysis.resolved.length}`);
    out.push(`◇ *LID sin número ›* ${analysis.unresolved.length}${analysis.skipped ? ` (+${analysis.skipped} sin revisar)` : ""}`);
    out.push(`◇ *Con actividad registrada ›* ${tracking.tracked}/${participants.length}`);
    out.push(`◇ *Activos últimos 7 días ›* ${tracking.recent}`);
    out.push(`◇ *Registros sin participante ›* ${tracking.orphans}/${tracking.total}`);
    out.push("");
    out.push("➭ *Tu usuario*");
    out.push(`◇ *Detectado en el grupo ›* ${flag(g.me)}`);
    out.push(`◇ *participant.id ›* ${code(g.me?.id)}`);
    out.push(`◇ *participant.admin ›* ${code(g.me?.admin)}`);
    out.push(`◇ *Owner ›* ${flag(isOwner)}`);

    if (wantList) {
      out.push("");
      out.push("➭ *Participantes sin número*");
      if (!analysis.unresolved.length) out.push(`◇ ${NONE}`);
      for (const participant of analysis.unresolved.slice(0, LIST_LIMIT)) {
        out.push(`◇ ${code(participant.id)} · lid ${code(participant.lid)} · ${code(participant.admin || "member")}`);
      }
      if (analysis.unresolved.length > LIST_LIMIT) out.push(`◇ … y ${analysis.unresolved.length - LIST_LIMIT} más`);
    }

    out.push("");
    out.push("➭ *Diagnóstico*");
    for (const issue of diagnose(info)) out.push(`◇ ${issue}`);

    if (!wantList && analysis.unresolved.length) out.push(`\n> ✎ Usa *${usedPrefix + command} lista* para ver los participantes sin número.`);

    const text = out.join("\n");
    console.log(`[gpcheck]\n${text.replace(/[*`]/g, "")}`);
    return kit.reply(sock, msg, text);
  } catch (e) {
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["gpcheck", "checkgp", "chequeogp"];
handler.description = "Ver qué está activo en el grupo y cómo detecta el bot a los usuarios (solo owner).";
handler.category = "Owner";
module.exports = handler;
