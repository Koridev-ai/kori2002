"use strict";

const nsfw = require("./nsfwkit");

const SYMBOLS = ["(⁠◠⁠‿⁠◕⁠)", "˃͈◡˂͈", "૮(˶ᵔᵕᵔ˶)ა", "(づ｡◕‿‿◕｡)づ", "(✿◡‿◡)", "(꒪⌓꒪)", "(✿✪‿✪｡)", "(*≧ω≦)", "(✧ω◕)", "˃ 𖥦 ˂", "(⌒‿⌒)", "(¬‿¬)", "(✧ω✧)", "✿(◕ ‿◕)✿", "ʕ•́ᴥ•̀ʔっ", "(ㅇㅅㅇ❀)", "(∩︵∩)", "(✪ω✪)", "(✯◕‿◕✯)", "(•̀ᴗ•́)و ̑̑"];

const randomSymbol = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

const shuffle = (list) => {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const fromOtaku = async (name) => {
  const data = await nsfw.getJson("https://api.otakugifs.xyz/gif", { reaction: name, format: "gif" });
  if (typeof data?.url !== "string" || !data.url.startsWith("http")) return [];
  return [{ url: data.url, ext: "gif" }];
};

const fromPurrbot = async (name) => {
  const data = await nsfw.getJson(`https://api.purrbot.site/v2/img/sfw/${name}/gif`);
  if (!data || data.error || typeof data.link !== "string") return [];
  return [{ url: data.link, ext: "gif" }];
};

async function getList(sources) {
  const order = shuffle(
    [
      sources.purr && (() => fromPurrbot(sources.purr)),
      sources.otaku && (() => fromOtaku(sources.otaku)),
      sources.otaku && (() => fromOtaku(sources.otaku))
    ].filter(Boolean)
  );
  const list = [];
  let lastError = null;
  for (const run of order) {
    try {
      const found = await run();
      list.push(...shuffle(found).slice(0, 4));
      if (list.length >= 4) break;
    } catch (e) {
      lastError = e;
    }
  }
  if (!list.length) throw lastError || new Error("Sin resultados para esta reacción");
  return list.filter((m) => ["gif", "mp4", "webm"].includes(m.ext));
}

module.exports = { randomSymbol, getList };
