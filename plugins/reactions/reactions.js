"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");
const nsfw = require("../../libs/nsfwkit");
const react = require("../../libs/reactkit");

const REACTIONS = {
  kiss: { self: "se besó a sí mismo", other: "le dio un beso a", nekos: "kiss", purr: "kiss", waifu: "kiss", aliases: ["kiss", "beso", "besar"] },
  hug: { self: "se abrazó a sí mismo", other: "le dio un abrazo a", nekos: "hug", purr: "hug", waifu: "hug", aliases: ["hug", "abrazo", "abrazar"] },
  pat: { self: "se acarició la cabeza", other: "le acarició la cabeza a", nekos: "pat", purr: "pat", waifu: "pat", aliases: ["pat", "acariciar"] },
  cuddle: { self: "se acurrucó solito", other: "se acurrucó con", nekos: "cuddle", purr: "cuddle", waifu: "cuddle", aliases: ["cuddle", "acurrucar"] },
  slap: { self: "se dio una bofetada", other: "le dio una bofetada a", nekos: "slap", purr: "slap", waifu: "slap", aliases: ["slap", "bofetada"] },
  bite: { self: "se mordió", other: "mordió a", nekos: "bite", purr: "bite", waifu: "bite", aliases: ["bite", "morder"] },
  lick: { self: "se lamió", other: "lamió a", nekos: null, purr: "lick", waifu: "lick", aliases: ["lick", "lamer"] },
  poke: { self: "se picó la mejilla", other: "picó a", nekos: "poke", purr: "poke", waifu: "poke", aliases: ["poke", "picar"] },
  tickle: { self: "se hizo cosquillas", other: "le hizo cosquillas a", nekos: "tickle", purr: "tickle", waifu: null, aliases: ["tickle", "cosquillas"] },
  bonk: { self: "se dio un bonk", other: "le dio un bonk a", nekos: null, purr: null, waifu: "bonk", aliases: ["bonk"] },
  kill: { self: "se desvaneció dramáticamente", other: "eliminó a", nekos: null, purr: null, waifu: "kill", aliases: ["kill", "matar"] },
  punch: { self: "se dio un golpe", other: "le dio un puñetazo a", nekos: "punch", purr: null, waifu: null, aliases: ["punch", "golpear"] },
  kick: { self: "se pateó a sí mismo", other: "le dio una patada a", nekos: "kick", purr: null, waifu: "kick", aliases: ["patear"] },
  highfive: { self: "chocó los cinco con el aire", other: "chocó los cinco con", nekos: "highfive", purr: null, waifu: "highfive", aliases: ["highfive", "chocalas"] },
  handhold: { self: "se tomó de la mano", other: "tomó de la mano a", nekos: "handhold", purr: null, waifu: "handhold", aliases: ["handhold", "tomarmano"] },
  feed: { self: "se está comiendo algo rico", other: "le dio de comer a", nekos: "feed", purr: null, waifu: null, aliases: ["feed", "alimentar"] },
  nom: { self: "está comiendo", other: "le dio un mordisquito a", nekos: "nom", purr: null, waifu: "nom", aliases: ["nom"] },
  yeet: { self: "salió volando", other: "lanzó por los aires a", nekos: "yeet", purr: null, waifu: "yeet", aliases: ["yeet"] },
  bully: { self: "se está molestando solito", other: "está molestando a", nekos: null, purr: null, waifu: "bully", aliases: ["bully", "molestar"] },
  cry: { self: "está llorando", other: "está llorando por culpa de", nekos: "cry", purr: "cry", waifu: "cry", aliases: ["cry", "llorar"] },
  laugh: { self: "se está riendo", other: "se está riendo de", nekos: "laugh", purr: null, waifu: null, aliases: ["laugh", "reir"] },
  dance: { self: "está bailando", other: "está bailando con", nekos: "dance", purr: "dance", waifu: "dance", aliases: ["dance", "bailar"] },
  blush: { self: "se sonrojó", other: "se sonrojó por", nekos: "blush", purr: "blush", waifu: "blush", aliases: ["blush", "sonrojar"] },
  happy: { self: "está muy feliz", other: "está feliz con", nekos: "happy", purr: null, waifu: "happy", aliases: ["happy", "feliz"] },
  smile: { self: "está sonriendo", other: "le sonrió a", nekos: "smile", purr: "smile", waifu: "smile", aliases: ["smile", "sonreir"] },
  wink: { self: "se guiñó un ojo", other: "le guiñó un ojo a", nekos: "wink", purr: null, waifu: "wink", aliases: ["wink", "guiñar"] },
  wave: { self: "está saludando", other: "saludó a", nekos: "wave", purr: null, waifu: "wave", aliases: ["saludar"] },
  smug: { self: "se siente muy orgulloso", other: "miró con aires de superioridad a", nekos: "smug", purr: null, waifu: "smug", aliases: ["smug", "presumir"] },
  pout: { self: "está haciendo pucheros", other: "le hizo pucheros a", nekos: "pout", purr: null, waifu: null, aliases: ["pout", "pucheros"] },
  sleep: { self: "se quedó dormido", other: "se durmió junto a", nekos: "sleep", purr: null, waifu: null, aliases: ["sleep", "dormir"] },
  stare: { self: "está mirando fijamente", other: "está mirando fijamente a", nekos: "stare", purr: null, waifu: null, aliases: ["stare", "mirar"] },
  cringe: { self: "siente vergüenza ajena", other: "siente vergüenza ajena por", nekos: null, purr: null, waifu: "cringe", aliases: ["cringe"] }
};

const ALIAS = Object.fromEntries(Object.entries(REACTIONS).map(([name, r]) => [name, r.aliases]));

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = String(ctx.command || "kiss").toLowerCase();

  try {
    const key = Object.keys(ALIAS).find((name) => ALIAS[name].includes(command));
    const reaction = key && REACTIONS[key];
    if (!reaction) return;

    const senderJid = pdb.selfJid(msg);
    const senderRaw = pdb.rawSelfJid(msg);
    const target = pdb.mentionTarget(msg);
    const targetJid = target ? target.jid : senderJid;
    const targetRaw = target ? target.raw : senderRaw;
    const same = pdb.key(senderJid) === pdb.key(targetJid);

    const from = pdb.label(senderJid, senderRaw);
    const to = pdb.label(targetJid, targetRaw);
    const mentions = [from.jid, to.jid].filter(Boolean);

    const caption = same
      ? `\`${from.text}\` ${reaction.self} ${react.randomSymbol()}.`
      : `\`${from.text}\` ${reaction.other} \`${to.text}\` ${react.randomSymbol()}.`;

    await kit.react(sock, msg, "✧");
    const list = await react.getList(reaction);
    let sent = false;
    let lastError = null;
    for (const media of list) {
      try {
        await nsfw.sendMedia(sock, msg, media, caption, mentions, { gif: true });
        sent = true;
        break;
      } catch (e) {
        lastError = e;
      }
    }
    if (!sent) throw lastError || new Error("Sin resultados para esta reacción");
    await kit.react(sock, msg, "✔");
  } catch (e) {
    await kit.react(sock, msg, "✖");
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = Object.values(ALIAS).flat();
handler.description = "Reacciones entre usuarios: kiss, hug, pat, slap, cry, dance y más.";
handler.category = "Reacciones";
module.exports = handler;
