"use strict";

const db = require("./groupdb");
const gk = require("./groupkit");
const lid = require("./lid");
const ecomath = require("./ecomath");

const INVITE_REGEX = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;

async function onMessage(sock, msg, text) {
  const chatId = msg.key.remoteJid;
  if (!chatId.endsWith("@g.us") || msg.key.fromMe || !msg.message) return;
  const jid = await lid.resolve(sock, msg.key.participant, msg).catch(() => msg.key.participant);
  db.track(chatId, jid, String(text || "").startsWith(global.prefix || "."));
  await ecomath.check(sock, msg, text, jid).catch(() => null);
  const chat = db.chat(chatId);
  if (!chat.antilinks) return;
  const match = String(text || "").match(INVITE_REGEX);
  if (!match) return;
  const g = await gk.context(sock, msg);
  if (!g.isGroup || !g.isBotAdmin || !g.me) return;
  if (gk.isProtected(g.me, g, { admins: true })) return;
  const own = await sock.groupInviteCode(chatId).catch(() => null);
  if (own && own === match[1]) return;
  await sock.sendMessage(chatId, { delete: msg.key }).catch(() => null);
  await sock.groupParticipantsUpdate(chatId, [g.me.id], "remove").catch(() => null);
  await sock.sendMessage(chatId, { text: `《✧》 ${gk.mention(g.me.id)} fue eliminado por enviar enlaces de otros grupos.`, mentions: [g.me.id] });
}

async function allowCommand(sock, msg, command, sender) {
  const chatId = msg.key.remoteJid;
  if (!chatId.endsWith("@g.us")) return true;
  const chat = db.chat(chatId);
  if (!chat.disabled && !chat.adminonly) return true;
  const owner = await gk.ownerCheck(sock, msg, sender);
  if (owner) return true;
  const g = await gk.context(sock, msg);
  if (chat.disabled) return String(command).toLowerCase() === "bot" && g.isAdmin;
  return g.isAdmin;
}

function render(template, { jid, meta }) {
  return String(template)
    .split("@user").join(gk.mention(jid))
    .split("@group").join(meta?.subject || "Grupo")
    .split("@desc").join(meta?.desc || "Sin descripción")
    .split("@members").join(String(meta?.participants?.length ?? 0))
    .split("@time").join(gk.nowText());
}

async function onParticipants(sock, update) {
  const chatId = update?.id;
  if (!chatId || !chatId.endsWith("@g.us")) return;
  const chat = db.chat(chatId);
  const action = update.action;
  const jids = (update.participants || []).map((p) => (typeof p === "string" ? p : p?.id || p?.phoneNumber)).filter(Boolean);
  if (!jids.length) return;
  const wanted =
    (action === "add" && chat.welcome) ||
    (action === "remove" && chat.goodbye) ||
    ((action === "promote" || action === "demote") && chat.alerts);
  if (!wanted) return;
  const meta = await sock.groupMetadata(chatId).catch(() => null);

  if (action === "add") {
    const template = chat.sWelcome || "✦ Bienvenido @user a *@group*\n> Ahora somos @members miembros.";
    for (const jid of jids) await sock.sendMessage(chatId, { text: render(template, { jid, meta }), mentions: [jid] }).catch(() => null);
    return;
  }
  if (action === "remove") {
    const template = chat.sGoodbye || "✧ @user abandonó *@group*\n> Quedamos @members miembros.";
    for (const jid of jids) await sock.sendMessage(chatId, { text: render(template, { jid, meta }), mentions: [jid] }).catch(() => null);
    return;
  }
  const author = update.author || "";
  const verb = action === "promote" ? "promovió a" : "degradó a";
  for (const jid of jids) {
    const who = author ? `${gk.mention(author)} ${verb}` : `Se ${action === "promote" ? "promovió a" : "degradó a"}`;
    await sock
      .sendMessage(chatId, { text: `✐ ${who} ${gk.mention(jid)} ${action === "promote" ? "como administrador" : "de administrador"}.`, mentions: [jid, author].filter(Boolean) })
      .catch(() => null);
  }
}

module.exports = { onMessage, allowCommand, onParticipants };
