"use strict";

const kit = require("../../libs/pluginkit");
const lid = require("../../libs/lid");
const gk = require("../../libs/groupkit");
const pdb = require("../../libs/profiledb");

const MAX_TARGETS = 3;
const NONE = "—";
const YES = "✓";
const NO = "✗";

const code = (value) => (value === null || value === undefined || value === "" ? NONE : `\`${value}\``);
const flag = (value) => (value ? YES : NO);

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

function participantOf(meta, jid) {
  const id = lid.user(jid);
  if (!id || !meta) return null;
  return (meta.participants || []).find((p) => lid.user(p.id) === id || lid.user(p.lid) === id || lid.user(p.phoneNumber) === id || lid.user(p.jid) === id) || null;
}

function pnFromParticipant(participant) {
  const pn = [participant?.phoneNumber, participant?.jid, participant?.id].find((value) => value && lid.isPn(value));
  return pn ? lid.toPn(pn) : null;
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

function collectTargets(msg, args, meta) {
  const found = [];
  const seen = new Set();
  const add = (jid, source) => {
    const id = lid.user(jid);
    if (!jid || !id || seen.has(id)) return;
    seen.add(id);
    found.push({ jid, source });
  };
  for (const jid of kit.getMentions(msg)) add(jid, "mención");
  const quoted = kit.getQuoted(msg)?.sender;
  if (quoted) add(quoted, "respuesta");
  for (const arg of args) {
    const digits = String(arg || "").replace(/[^0-9]/g, "");
    if (digits.length < 7) continue;
    const participant = participantOf(meta, digits);
    add(participant?.id || `${digits}@s.whatsapp.net`, "argumento");
  }
  return found.slice(0, MAX_TARGETS);
}

async function inspect(sock, chatId, meta, jid) {
  const probe = { key: { remoteJid: chatId } };
  const kind = kindOf(jid);
  const participant = participantOf(meta, jid);
  const data = { jid, kind, participant, store: null, pn: null, lid: null };

  if (kind === "LID") {
    data.lid = lid.toLid(jid);
    data.store = await fromStore(sock, jid);
    data.pn = await attempt(() => lid.getPN(sock, jid, probe));
  } else if (kind === "Número") {
    data.pn = lid.toPn(jid);
    data.lid = await attempt(() => lid.getLID(sock, jid));
  }

  const number = data.pn ? lid.user(data.pn) : null;
  const ids = [lid.user(jid), number, data.lid ? lid.user(data.lid) : null].filter(Boolean);
  const extra = [jid, data.pn].filter(Boolean);

  data.number = number;
  data.ids = [...new Set(ids)];
  data.listedOwner = await attempt(() => lid.isListed(sock, probe, global.owner, extra));
  data.listedMod = data.listedOwner || (await attempt(() => lid.isListed(sock, probe, global.mods, extra)));
  data.idOwner = !!(await attempt(() => data.ids.some((id) => global.isOwner(id))));
  data.idMod = !!(await attempt(() => data.ids.some((id) => global.isMod(id))));
  data.profile = await attempt(() => pdb.peekAny(data.ids));
  return data;
}

function render(data, source, index) {
  const lines = [`➭ *Usuario ${index} · ${source}*`];
  lines.push(`◇ *JID crudo ›* ${code(data.jid)}`);
  lines.push(`◇ *Tipo ›* ${data.kind}`);

  if (data.kind === "LID") {
    const store = data.store?.available ? `${code(data.store.pn)}${data.store.via ? ` (${data.store.via})` : ""}` : "no disponible";
    lines.push(`◇ *Store de LID ›* ${store}`);
    lines.push(`◇ *Número resuelto ›* ${code(data.number)}`);
  } else if (data.kind === "Número") {
    lines.push(`◇ *Número ›* ${code(data.number)}`);
    lines.push(`◇ *LID mapeado ›* ${code(data.lid)}`);
  }

  const p = data.participant;
  lines.push(`◇ *En el grupo ›* ${flag(p)}`);
  if (p) {
    lines.push(`◇ *participant.id ›* ${code(p.id)}`);
    lines.push(`◇ *participant.lid ›* ${code(p.lid)}`);
    lines.push(`◇ *participant.phoneNumber ›* ${code(p.phoneNumber)}`);
    lines.push(`◇ *participant.jid ›* ${code(p.jid)}`);
    lines.push(`◇ *participant.admin ›* ${code(p.admin)}`);
  }

  lines.push(`◇ *IDs que prueba el bot ›* ${data.ids.length ? data.ids.map(code).join(", ") : NONE}`);
  lines.push(`◇ *owner ›* ${flag(data.listedOwner || data.idOwner)}  *mod ›* ${flag(data.listedMod || data.idMod)}`);
  lines.push(`◇ *lid.isListed ›* owner ${flag(data.listedOwner)} · mod ${flag(data.listedMod)}`);
  lines.push(`◇ *global.isOwner/isMod ›* ${flag(data.idOwner)} · ${flag(data.idMod)}`);
  if (data.profile) lines.push(`◇ *Perfil ›* ${code(data.profile.name)} · nivel ${data.profile.level ?? NONE}`);
  return lines;
}

function verdict(data) {
  if (data.kind === "Desconocido") return "El JID no es ni número ni LID, revisa cómo llegó la mención.";
  if (data.kind === "LID" && !data.number) {
    return `No se pudo convertir el LID ${code(lid.user(data.jid))} a número. Pide que ese usuario escriba algo en el chat para que el bot aprenda su alterno, o revisa si el store de LID del socket está disponible.`;
  }
  if (!data.participant) return `El usuario ${code(data.number || lid.user(data.jid))} se resolvió, pero no aparece en la metadata de este grupo.`;
  return `El usuario ${code(data.number || lid.user(data.jid))} se detecta correctamente.`;
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "numdebug";

  try {
    const key = msg.key || {};
    const chatId = key.remoteJid;
    const isGroup = !!chatId && chatId.endsWith("@g.us");
    const privileged = !!(key.fromMe || msg.__owner || msg.__mod || (ctx.role && ctx.role !== "none"));

    if (!privileged) return kit.reply(sock, msg, "「✧」 Solo los *owners* o *mods* pueden usar este comando.");

    const meta = isGroup ? await attempt(() => sock.groupMetadata(chatId)) : null;
    const args = (ctx.args || []).filter(Boolean);
    const rawMentions = kit.getMentions(msg);
    const quoted = kit.getQuoted(msg)?.sender || null;
    const targets = collectTargets(msg, args, meta);

    if (!targets.length) {
      const typedTag = args.some((arg) => String(arg).startsWith("@"));
      const hint = typedTag
        ? "\n> ✎ Escribiste un `@` pero WhatsApp no lo envió como mención real. Elige al usuario desde la lista que aparece al escribir `@`."
        : "";
      return kit.reply(
        sock,
        msg,
        `「✧」 Etiqueta, responde al mensaje o escribe el número del usuario.\n> ✎ Ejemplo: *${usedPrefix + command} @usuario*${hint}`
      );
    }

    const out = [];
    out.push("「✧」 *Numdebug*");
    out.push("");
    out.push("➭ *Mensaje*");
    out.push(`◇ *Chat ›* ${code(chatId)} (${isGroup ? "grupo" : "privado"})`);
    out.push(`◇ *mentionedJid crudo ›* ${rawMentions.length ? rawMentions.map(code).join(", ") : NONE}`);
    out.push(`◇ *Respondido a ›* ${code(quoted)}`);
    out.push(`◇ *Argumentos ›* ${args.length ? code(args.join(" ")) : NONE}`);

    const results = [];
    let index = 1;
    for (const target of targets) {
      const data = await inspect(sock, chatId, meta, target.jid);
      results.push(data);
      out.push("");
      out.push(...render(data, target.source, index));
      index++;
    }

    if (isGroup) {
      const g = await attempt(() => gk.context(sock, msg));
      const t = g ? await attempt(() => gk.target(msg, g)) : null;
      const prepared = msg.__ids?.mentions || [];
      out.push("");
      out.push("➭ *Lo que ven los comandos de grupo*");
      if (prepared.length) {
        for (const item of prepared) out.push(`◇ *mención ›* ${code(item.raw)} ➜ ${code(item.jid)}`);
      } else {
        out.push(`◇ *mención ›* ${NONE}`);
      }
      if (msg.__ids?.quoted) out.push(`◇ *respuesta ›* ${code(msg.__ids.quoted.raw)} ➜ ${code(msg.__ids.quoted.jid)}`);
      out.push(`◇ *gk.target ›* ${t ? `jid ${code(t.jid)} · id de datos ${code(t.id)} · en grupo ${flag(t.p)}` : NONE}`);
    }

    out.push("");
    out.push("➭ *Diagnóstico*");
    if (!rawMentions.length && !quoted && targets.every((t) => t.source === "argumento")) {
      out.push("◇ El mensaje no trae ninguna mención real, se usó el número escrito.");
    }
    for (let i = 0; i < results.length; i++) out.push(`◇ *Usuario ${i + 1} ›* ${verdict(results[i])}`);

    const text = out.join("\n");
    console.log(`[numdebug]\n${text.replace(/[*`]/g, "")}`);

    return kit.reply(sock, msg, text);
  } catch (e) {
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["numdebug", "debugnum"];
handler.description = "Ver cómo el bot detecta el número, LID y rol de un usuario etiquetado.";
handler.category = "Utilidades";
module.exports = handler;
