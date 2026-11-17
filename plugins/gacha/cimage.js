"use strict";

const gacha = require("../../libs/gachakit");
const yandere = require("../../libs/yandere");
const kit = require("../../libs/pluginkit");
const dl = require("../../libs/dlkit");

const DEFAULT_COUNT = 1;
const MAX_COUNT = 10;

async function collectPosts(tag, count) {
  const posts = new Map();
  for (let i = 0; i < count * 4 && posts.size < count; i++) {
    const post = await yandere.getRandomPost(tag);
    if (post && post.url && !posts.has(post.id)) posts.set(post.id, post);
  }
  return [...posts.values()];
}

module.exports = gacha.define({
  commands: ["cimage", "cimg", "charimage", "waifuimage", "wimage"],
  description: "Muestra imágenes de un personaje del gacha.",
  run: async ({ sock, msg, chatId, args, usedPrefix, command }) => {
    const last = args[args.length - 1];
    const hasCount = args.length > 1 && /^\d{1,2}$/.test(last);
    const count = hasCount ? Math.min(Math.max(parseInt(last, 10), 1), MAX_COUNT) : DEFAULT_COUNT;
    const query = (hasCount ? args.slice(0, -1) : args).join(" ");
    if (!query) return kit.reply(sock, msg, `❀ Por favor, proporciona el nombre de un personaje.\n> Ejemplo » *${usedPrefix}${command} Rem*\n> Con cantidad » *${usedPrefix}${command} Rem 3*`);

    const character = gacha.findCharacterByQuery(query);
    if (!character) return kit.reply(sock, msg, `ꕥ No se encontró el personaje *${query}*.`);

    kit.react(sock, msg, "🕒");
    const posts = await collectPosts(character.tag, count);
    if (!posts.length) {
      kit.react(sock, msg, "✖️");
      return kit.reply(sock, msg, `✐ No se encontraron imágenes para *${character.name}*, intenta de nuevo.`);
    }

    const items = posts.map((post, index) => ({
      type: "image",
      data: { url: post.url },
      caption: index === 0 ? `✿ Nombre » *${character.name}*\n❖ Serie » *${character.series}*\n✦ ID » \`${character.id}\`\n❏ Imágenes » *${posts.length}*` : ""
    }));
    if (items.length === 1) await sock.sendMessage(chatId, { image: items[0].data, caption: items[0].caption }, { quoted: msg });
    else await dl.sendAlbum(sock, chatId, items, msg);
    kit.react(sock, msg, "🌸");
  }
});
