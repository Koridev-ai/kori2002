"use strict";

const kit = require("../../libs/pluginkit");
const dl = require("../../libs/dlkit");

function providers(url) {
  const enc = encodeURIComponent(url);
  return [
    async () => {
      const res = await dl.getJson(`${dl.api("ootaizumi").url}/downloader/instagram/v1?url=${enc}`);
      const media = res?.status && res.result?.media?.[0];
      if (!media?.url) return null;
      const meta = res.result.metadata || {};
      return {
        type: media.isVideo ? "video" : "image",
        url: media.url,
        author: meta.author || null,
        like: meta.like === -1 ? null : meta.like,
        views: meta.views || null,
        duration: meta.duration ? `${Math.round(meta.duration)}s` : null
      };
    },
    async () => {
      const res = await dl.getJson(`${dl.api("delirius").url}/download/instagram?url=${enc}`);
      const media = res?.status && res.data?.[0];
      if (!media?.url) return null;
      return { type: media.type || (media.url.includes(".mp4") ? "video" : "image"), url: media.url };
    },
    async () => {
      const res = await dl.getJson(`${dl.api("zenzxz").url}/download/instagram?url=${enc}`);
      if (!res?.status || !res.result?.url) return null;
      return { type: res.result.is_video ? "video" : "image", url: res.result.url, author: res.result.username || null, caption: res.result.caption || null };
    },
    async () => {
      const res = await dl.getJson(`${dl.api("siputzx").url}/api/d/igdl`, { params: { url } });
      const found = dl.deepFind(res, ["url", "download", "dl"]);
      return found ? { type: /\.mp4|video/i.test(found) ? "video" : "image", url: found } : null;
    }
  ];
}

module.exports = dl.define({
  commands: ["instagram", "ig", "reel"],
  description: "Descargar un reel de Instagram.",
  run: async ({ sock, msg, chatId, args }) => {
    if (!args[0]) return kit.reply(sock, msg, "《✧》 Por favor, ingrese un enlace de Instagram.");
    if (!/instagram\.com\/(p|reel|reels|share|tv|stories)\//i.test(args[0])) {
      return kit.reply(sock, msg, "《✧》 El enlace no parece *válido*. Asegúrate de que sea de *Instagram*.");
    }
    await kit.react(sock, msg, "✧");
    const data = await dl.chain(providers(args[0]));
    if (!data) return kit.reply(sock, msg, "《✧》 No se pudo obtener el contenido.");
    const caption = dl.cap("Instagram Download", [
      ["Usuario", data.author],
      ["Descripción", data.caption],
      ["Likes", data.like],
      ["Vistas", data.views],
      ["Duración", data.duration],
      ["Enlace", args[0]]
    ]);
    if (data.type === "video") await sock.sendMessage(chatId, { video: { url: data.url }, caption, mimetype: "video/mp4", fileName: "ig.mp4" }, { quoted: msg });
    else await sock.sendMessage(chatId, { image: { url: data.url }, caption }, { quoted: msg });
    return kit.react(sock, msg, "✔");
  }
});
