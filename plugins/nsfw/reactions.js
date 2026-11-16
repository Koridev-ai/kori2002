"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");
const nsfw = require("../../libs/nsfwkit");

const REACTIONS = {
  anal: { self: "se la metió en el ano.", other: "se la metió en el ano a", purr: "anal", tag: "anal" },
  cum: { self: "se vino dentro de... Omitiremos eso.", other: "se vino dentro de", purr: "cum", tag: "cum" },
  undress: { self: "se está quitando la ropa", other: "le está quitando la ropa a", purr: null, tag: "undressing" },
  fuck: { self: "se entrega al deseo", other: "se está cogiendo a", purr: "fuck", tag: "sex" },
  spank: { self: "está dando una nalgada", other: "le está dando una nalgada a", purr: null, tag: "spanking" },
  lickpussy: { self: "está lamiendo un coño", other: "le está lamiendo el coño a", purr: "pussylick", tag: "cunnilingus" },
  fap: { self: "se está masturbando", other: "se está masturbando pensando en", purr: "solo", tag: "masturbation" },
  grope: { self: "se lo está manoseando", other: "se lo está manoseando a", purr: null, tag: "groping" },
  sixnine: { self: "está haciendo un 69", other: "está haciendo un 69 con", purr: null, tag: "69" },
  suckboobs: { self: "está chupando unas ricas tetas", other: "le está chupando las tetas a", purr: null, tag: "nipple_suck" },
  grabboobs: { self: "está agarrando unas tetas", other: "le está agarrando las tetas a", purr: null, tag: "grabbing_another's_breast" },
  blowjob: { self: "está dando una rica mamada", other: "le dio una mamada a", purr: "blowjob", tag: "fellatio" },
  boobjob: { self: "esta haciendo una rusa", other: "le está haciendo una rusa a", purr: null, tag: "paizuri" },
  footjob: { self: "está haciendo una paja con los pies", other: "le está haciendo una paja con los pies a", purr: null, tag: "footjob" },
  yuri: { self: "está haciendo tijeras!", other: "hizo tijeras con", purr: "yuri", tag: "yuri" },
  cummouth: { self: "está llenando la boca de alguien con cariño", other: "está llenando la boca de", purr: "cum", tag: "cum_in_mouth" },
  cumshot: { self: "se la metió a alguien y ahora viene el regalo", other: "le dio un regalo sorpresa a", purr: "cum", tag: "cumshot" },
  handjob: { self: "le da una paja a alguien con cariño", other: "le está haciendo una paja a", purr: null, tag: "handjob" },
  lickass: { self: "saborea un culo sin detenerse", other: "le está lamiendo el culo a", purr: null, tag: "anilingus" },
  lickdick: { self: "chupa con ganas un pene", other: "se la mete todo en la boca para", purr: null, tag: "licking_penis" },
  fingering: { self: "se está metiendo los dedos", other: "le está metiendo los dedos a", purr: null, tag: "fingering" },
  creampie: { self: "terminó dentro sin avisar...", other: "terminó dentro de", purr: "cum", tag: "creampie" },
  facesitting: { self: "está sentándose en una cara", other: "se sentó en la cara de", purr: null, tag: "facesitting" },
  deepthroat: { self: "se la traga hasta el fondo", other: "le está haciendo una garganta profunda a", purr: "blowjob", tag: "deepthroat" },
  thighjob: { self: "está frotando entre los muslos", other: "le está haciendo una entre piernas a", purr: null, tag: "thigh_sex" },
  bondage: { self: "está atado y sin escapatoria...", other: "ató bien amarrado a", purr: null, tag: "bondage" },
  pegging: { self: "está recibiendo lo que no esperaba", other: "le está dando por detrás a", purr: null, tag: "pegging" },
  futanari: { self: "tiene lo mejor de los dos mundos", other: "le demostró lo que tiene a", purr: null, tag: "futanari" },
  yaoi: { self: "está disfrutando de un momento muy intenso", other: "se lo pasó genial con", purr: "yaoi", tag: "yaoi" },
  bukkake: { self: "terminó solo... de una forma muy especial", other: "invitó a sus amigos a acabar encima de", purr: null, tag: "bukkake" },
  orgy: { self: "está en una orgía", other: "organizó una orgía con", purr: "threesome_ffm", tag: "group_sex" },
  squirting: { self: "llegó al límite y se vino con todo", other: "la llevó al límite hasta que se vino con todo", purr: null, tag: "squirting" }
};

const ALIAS = {
  anal: ["anal", "violar"],
  cum: ["cum"],
  undress: ["undress", "encuerar"],
  fuck: ["fuck", "coger"],
  spank: ["spank", "nalgada"],
  lickpussy: ["lickpussy"],
  fap: ["fap", "paja"],
  grope: ["grope"],
  sixnine: ["sixnine", "69"],
  suckboobs: ["suckboobs"],
  grabboobs: ["grabboobs"],
  blowjob: ["blowjob", "mamada", "bj"],
  boobjob: ["boobjob"],
  yuri: ["yuri", "tijeras"],
  footjob: ["footjob"],
  cummouth: ["cummouth"],
  cumshot: ["cumshot"],
  handjob: ["handjob"],
  lickass: ["lickass"],
  lickdick: ["lickdick"],
  fingering: ["fingering"],
  creampie: ["creampie"],
  facesitting: ["facesitting"],
  deepthroat: ["deepthroat"],
  thighjob: ["thighjob"],
  bondage: ["bondage"],
  pegging: ["pegging"],
  futanari: ["futanari", "futa"],
  yaoi: ["yaoi"],
  bukkake: ["bukkake"],
  orgy: ["orgy", "orgia"],
  squirting: ["squirt", "squirting"]
};

const SYMBOLS = ["(⁠◠⁠‿⁠◕⁠)", "˃͈◡˂͈", "૮(˶ᵔᵕᵔ˶)ა", "(づ｡◕‿‿◕｡)づ", "(✿◡‿◡)", "(꒪⌓꒪)", "(✿✪‿✪｡)", "(*≧ω≦)", "(✧ω◕)", "˃ 𖥦 ˂", "(⌒‿⌒)", "(¬‿¬)", "(✧ω✧)", "✿(◕ ‿◕)✿", "ʕ•́ᴥ•̀ʔっ", "(ㅇㅅㅇ❀)", "(∩︵∩)", "(✪ω✪)", "(✯◕‿◕✯)", "(•̀ᴗ•́)و ̑̑"];

const randomSymbol = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "fuck";

  try {
    if (!nsfw.isEnabled(chatId)) return kit.reply(sock, msg, nsfw.disabledText(usedPrefix));

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
      ? `\`${from.text}\` ${reaction.self} ${randomSymbol()}.`
      : `\`${from.text}\` ${reaction.other} \`${to.text}.\` ${randomSymbol()}.`;

    await kit.react(sock, msg, "✧");
    const list = await nsfw.getReactionList(reaction);
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

handler.command = ["anal", "violar", "cum", "undress", "encuerar", "fuck", "coger", "spank", "nalgada", "lickpussy", "fap", "paja", "grope", "sixnine", "69", "suckboobs", "grabboobs", "blowjob", "mamada", "bj", "boobjob", "yuri", "tijeras", "footjob", "cummouth", "cumshot", "handjob", "lickass", "lickdick", "fingering", "creampie", "facesitting", "deepthroat", "thighjob", "bondage", "pegging", "futanari", "futa", "yaoi", "bukkake", "orgy", "orgia", "squirt", "squirting"];
handler.description = "Reacciones NSFW entre usuarios.";
handler.category = "NSFW";
module.exports = handler;
