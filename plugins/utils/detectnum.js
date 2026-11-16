"use strict";

const kit = require("../../libs/pluginkit");
const lid = require("../../libs/lid");
const botconf = require("../../libs/botconf");
const pdb = require("../../libs/profiledb");

const PARTICIPANT_ALTS = ["participantAlt", "participantPn", "participant_pn", "senderPn", "sender_pn"];
const CHAT_ALTS = ["remoteJidAlt", "remoteJidPn", "remote_jid_pn"];
const MAX_TARGETS = 3;
const MAX_LISTED = 10;
const NONE = "—";

const code = (value) => (value === null || value === undefined || value === "" ? NONE : `\`${value}\``);
const flag = (value) => (value ? "✅" : "❌");

function mask(value) {
  const id = lid.user(value);
  if (id.length <= 8) return "*".repeat(id.length);
  return `${id.slice(0, 4)}${"*".repeat(id.length - 8)}${id.slice(-4)}`;
}

async function attempt(fn) {
  try {
    return await fn();
  } catch {
    return null;
  }
}

function kindOf(jid) {
  if (lid.isLid(jid)) return "LID";
  if (lid.isPn(jid)) return "Número";
  return "Desconocido";
}

function altFromKey(key, jid) {
  const id = lid.user(jid);
  const sources = [];
  if (key.participant && lid.user(key.participant) === id) sources.push(...PARTICIPANT_ALTS);
  if (key.remoteJid && lid.user(key.remoteJid) === id) sources.push(...CHAT_ALTS);
  const field = sources.find((name) => key[name] && lid.isPn(key[name]));
  return field ? { field, pn: lid.toPn(key[field]) } : null;
}

async function fromStore(sock, jid) {
  const store = sock?.signalRepository?.lidMapping;
  if (!store) return { available: false, pn: null, via: null };
  const target = lid.toLid(jid);
  const cached = await attempt(() => store.phoneCache?.getPhoneForLid?.(target));
  if (cached && !lid.isLid(cached)) return { available: true, pn: lid.toPn(cached), via: "phoneCache" };
  const stored = await attempt(() => store.getPNForLID?.(target));
  if (stored && !lid.isLid(stored)) return { available: true, pn: lid.toPn(stored), via: "getPNForLID" };
  return { available: true, pn: null, via: null };
}

async function groupMeta(sock, chatId) {
  if (!chatId || !chatId.endsWith("@g.us")) return null;
  return attempt(() => sock.groupMetadata(chatId));
}

function participantOf(meta, jid) {
  const id = lid.user(jid);
  if (!id || !meta) return null;
  return (meta.participants || []).find((p) => lid.user(p.id) === id || lid.user(p.lid) === id) || null;
}

function pnFromParticipant(participant) {
  const pn = [participant?.phoneNumber, participant?.jid, participant?.id].find((value) => value && lid.isPn(value));
  return pn ? lid.toPn(pn) : null;
}

async function trace(sock, msg, jid, meta) {
  const kind = kindOf(jid);
  const base = { jid, kind, alt: null, store: null, group: null, participant: null, final: null, number: null };
  if (kind === "Desconocido") return base;
  if (kind === "Número") {
    const pn = lid.toPn(jid);
    return { ...base, final: pn, number: lid.user(pn) };
  }
  const participant = participantOf(meta, jid);
  const final = await attempt(() => lid.getPN(sock, jid, msg));
  return {
    ...base,
    alt: altFromKey(msg.key || {}, jid),
    store: await fromStore(sock, jid),
    group: { checked: !!meta, found: !!participant, pn: pnFromParticipant(participant) },
    participant,
    final,
    number: final ? lid.user(final) : null
  };
}

function renderTrace(t) {
  const lines = [`◇ *Tipo ›* ${t.kind}`, `◇ *JID crudo ›* ${code(t.jid)}`];
  if (t.kind === "LID") {
    lines.push(`◇ *Alterno en key ›* ${t.alt ? `${code(t.alt.pn)} (${t.alt.field})` : NONE}`);
    const store = t.store.available ? `${code(t.store.pn)}${t.store.via ? ` (${t.store.via})` : ""}` : "no disponible";
    lines.push(`◇ *Store de LID ›* ${store}`);
    let group = "no aplica";
    if (t.group.checked) group = t.group.found ? (t.group.pn ? code(t.group.pn) : "participante sin número") : "participante no encontrado";
    lines.push(`◇ *Metadata del grupo ›* ${group}`);
  }
  lines.push(`◇ *Resuelto (lid.getPN) ›* ${code(t.final)}`);
  lines.push(`◇ *Número final ›* ${code(t.number)}`);
  return lines;
}

function renderParticipant(participant) {
  if (!participant) return [];
  return [
    `◇ *Participante id ›* ${code(participant.id)}`,
    `◇ *Participante lid ›* ${code(participant.lid)}`,
    `◇ *Participante phoneNumber ›* ${code(participant.phoneNumber)}`,
    `◇ *Participante jid ›* ${code(participant.jid)}`,
    `◇ *Participante admin ›* ${code(participant.admin)}`
  ];
}

async function candidateIds(sock, msg, sender) {
  const key = msg.key || {};
  const ids = [sender, botconf.number(key.participantAlt), botconf.number(key.remoteJidAlt)];
  const raw = key.participant || key.remoteJid;
  if (lid.isLid(raw)) {
    const resolved = await attempt(() => lid.resolve(sock, raw, msg));
    ids.push(botconf.number(resolved));
  }
  return [...new Set(ids.filter(Boolean))];
}

async function listedLines(sock, msg, list, ids, privileged) {
  const lines = [];
  for (const entry of (list || []).slice(0, MAX_LISTED)) {
    const number = lid.user(Array.isArray(entry) ? entry[0] : entry);
    if (!number) continue;
    const mapped = await attempt(() => lid.getLID(sock, `${number}@s.whatsapp.net`));
    const mappedId = mapped ? lid.user(mapped) : null;
    const hit = await attempt(() => lid.isListed(sock, msg, [entry], ids));
    const shownNumber = privileged ? number : mask(number);
    const shownLid = mappedId ? (privileged ? mappedId : mask(mappedId)) : null;
    lines.push(`◇ ${code(shownNumber)} → LID ${code(shownLid)} ${flag(hit)}`);
  }
  return lines.length ? lines : [`◇ ${NONE}`];
}

function verdict(state) {
  if (state.isOwner) return "Detectado como *owner* del bot.";
  if (state.isMod) return "Detectado como *mod* del bot.";
  if (state.trace.kind === "LID" && !state.trace.number) {
    return `No se pudo convertir el LID ${code(lid.user(state.trace.jid))} a número. Agrega ese LID a \`global.owner\` o \`global.mods\` en \`config.js\`, o revisa si el store de LID del socket está disponible.`;
  }
  const shown = state.trace.number || lid.user(state.trace.jid);
  return `El número detectado ${code(shown)} no coincide con \`global.owner\` ni \`global.mods\` en \`config.js\`.`;
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "detectnum";

  try {
    const key = msg.key || {};
    const chatId = key.remoteJid;
    const isGroup = !!chatId && chatId.endsWith("@g.us");
    const raw = key.participant || chatId;
    const privileged = !!(key.fromMe || msg.__owner || msg.__mod || (ctx.role && ctx.role !== "none"));

    const meta = await groupMeta(sock, chatId);
    const self = await trace(sock, msg, raw, meta);
    const ids = await candidateIds(sock, msg, ctx.sender);
    const listedOwner = await attempt(() => lid.isListed(sock, msg, global.owner, ids));
    const listedMod = listedOwner || (await attempt(() => lid.isListed(sock, msg, global.mods, ids)));
    const isOwner = pdb.isOwner(msg, ctx.sender);
    const isMod = pdb.isMod(msg, ctx.sender);

    const alts = [...new Set(["participantAlt", "remoteJidAlt", ...PARTICIPANT_ALTS.filter((f) => key[f]), ...CHAT_ALTS.filter((f) => key[f])])];

    const out = [];
    out.push("「✧」 *Detección de número*");
    out.push("");
    out.push("➭ *Mensaje*");
    out.push(`◇ *Chat ›* ${code(chatId)} (${isGroup ? "grupo" : "privado"})`);
    out.push(`◇ *key.participant ›* ${code(key.participant)}`);
    for (const field of alts) out.push(`◇ *key.${field} ›* ${code(key[field])}`);
    out.push(`◇ *fromMe ›* ${flag(key.fromMe)}`);
    out.push(`◇ *pushName ›* ${code(msg.pushName)}`);
    out.push("");
    out.push("➭ *Bot*");
    out.push(`◇ *Número ›* ${code(botconf.number(sock.user?.id))}`);
    out.push(`◇ *LID ›* ${code(botconf.number(sock.user?.lid))}`);
    out.push(`◇ *Sub-bot ›* ${flag(ctx.isSub)}`);
    out.push("");
    out.push("➭ *Resolución del remitente*");
    out.push(...renderTrace(self));
    out.push(...renderParticipant(self.participant));
    out.push("");
    out.push("➭ *Lo que ve el dispatcher*");
    out.push(`◇ *sender ›* ${code(ctx.sender)}`);
    out.push(`◇ *IDs candidatos ›* ${ids.length ? ids.map(code).join(", ") : NONE}`);
    out.push(`◇ *role ›* ${code(ctx.role)}`);
    out.push(`◇ *msg.__owner ›* ${flag(msg.__owner)}  *msg.__mod ›* ${flag(msg.__mod)}`);
    out.push(`◇ *pdb.isOwner ›* ${flag(isOwner)}  *pdb.isMod ›* ${flag(isMod)}`);
    out.push(`◇ *selfJid (perfil) ›* ${code(pdb.selfJid(msg))}`);
    out.push("");
    out.push("➭ *Coincidencia por ID*");
    for (const id of ids) out.push(`◇ ${code(id)} → owner ${flag(global.isOwner(id))} · mod ${flag(global.isMod(id))}`);
    out.push(`◇ *lid.isListed owner ›* ${flag(listedOwner)}  *mods ›* ${flag(listedMod)}`);
    out.push("");
    out.push("➭ *global.owner* (número → LID mapeado · coincide)");
    out.push(...(await listedLines(sock, msg, global.owner, ids, privileged)));
    out.push("");
    out.push("➭ *global.mods* (número → LID mapeado · coincide)");
    out.push(...(await listedLines(sock, msg, global.mods, ids, privileged)));

    const targets = [...new Set([...kit.getMentions(msg), kit.getQuoted(msg)?.sender].filter(Boolean))].slice(0, MAX_TARGETS);
    if (targets.length) {
      out.push("");
      if (!privileged) {
        out.push("➭ *Usuarios mencionados*");
        out.push("◇ Inspeccionar a otros usuarios requiere ser owner o mod.");
      } else {
        for (const target of targets) {
          out.push("➭ *Usuario mencionado*");
          out.push(...renderTrace(await trace(sock, msg, target, meta)));
          out.push("");
        }
        out.pop();
      }
    }

    out.push("");
    out.push("➭ *Diagnóstico*");
    out.push(`◇ ${verdict({ isOwner, isMod, trace: self })}`);

    const text = out.join("\n");
    console.log(`[detectnum]\n${text.replace(/[*`]/g, "")}`);
    return kit.reply(sock, msg, text);
  } catch (e) {
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["detectnum", "whoami", "minumero"];
handler.description = "Ver cómo el bot detecta tu número, LID y rol.";
handler.category = "Utilidades";
module.exports = handler;
