"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

const proposals = {};
const EXPIRE_MS = 120000;

const married = (genre) => (genre === "Mujer" ? "casada" : genre === "Hombre" ? "casado" : "casadx");
const spouse = (genre) => (genre === "Mujer" ? "Esposa" : genre === "Hombre" ? "Esposo" : "Esposx");
const self = (genre) => (genre === "Mujer" ? "misma" : genre === "Hombre" ? "mismo" : "mismx");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "marry";

  const proposer = pdb.selfJid(msg);
  const proposee = kit.getMentions(msg)[0] || kit.getQuoted(msg)?.sender || null;
  const botJid = (sock.user?.id || "").split(":")[0] + "@s.whatsapp.net";

  if (!proposee) {
    return sock.sendMessage(
      chatId,
      { text: `《✧》 Debes mencionar a alguien para aceptar o proponer matrimonio.\n> Ejemplo » *${usedPrefix + command}* @${botJid.split("@")[0]}`, mentions: [botJid] },
      { quoted: msg }
    );
  }

  const proposerKey = pdb.key(proposer);
  const proposeeKey = pdb.key(proposee);
  const a = pdb.get(proposer);
  const b = pdb.get(proposee);

  if (proposerKey === proposeeKey) {
    return kit.reply(sock, msg, `《✧》 No puedes proponerte matrimonio a ti ${self(a.genre)}`);
  }

  if (a.marry) {
    const partner = pdb.peek(a.marry);
    return kit.reply(sock, msg, `《✧》 Ya estás ${married(a.genre)} con *${partner?.name || "alguien"}*.`);
  }

  if (b.marry) {
    const partner = pdb.peek(b.marry);
    return kit.reply(sock, msg, `《✧》 *${b.name || proposeeKey}* ya está ${married(b.genre)} con *${partner?.name || "alguien"}*.`);
  }

  if (proposals[proposerKey]?.target === proposeeKey) {
    clearTimeout(proposals[proposerKey].timer);
    delete proposals[proposerKey];
  }

  if (proposals[proposeeKey]?.target === proposerKey) {
    clearTimeout(proposals[proposeeKey].timer);
    delete proposals[proposeeKey];
    pdb.set(proposer, "marry", proposeeKey);
    pdb.set(proposee, "marry", proposerKey);
    return kit.reply(
      sock,
      msg,
      `✩.･:｡≻───── ⋆♡⋆ ─────.•:｡✩\n¡Se han Casado! ฅ^•ﻌ•^ฅ*:･ﾟ✧\n\n*•.¸♡ ${spouse(a.genre)} ${a.name || proposerKey} ♡¸.•*\n*•.¸♡ ${spouse(b.genre)} ${b.name || proposeeKey} ♡¸.•*\n\n\`Disfruten de su luna de miel\`\n\n✩.･:｡≻───── ⋆♡⋆ ─────.•:｡✩`
    );
  }

  if (proposals[proposerKey]) clearTimeout(proposals[proposerKey].timer);
  proposals[proposerKey] = {
    target: proposeeKey,
    timer: setTimeout(() => {
      delete proposals[proposerKey];
    }, EXPIRE_MS)
  };

  return sock.sendMessage(
    chatId,
    {
      text: `♡ ${b.name || proposeeKey}, el usuario ${a.name || proposerKey} te ha enviado una propuesta de matrimonio, ¿aceptas? •(=^●ω●^=)•\n\n⚘ *Responde con:*\n> ● *_${usedPrefix + command} @${proposerKey}_* para confirmar.\n> ● La propuesta expirará en 2 minutos.`,
      mentions: [proposer, proposee]
    },
    { quoted: msg }
  );
};

handler.command = ["marry", "casarse"];
handler.description = "Casarte con alguien.";
handler.category = "Perfil";
module.exports = handler;
