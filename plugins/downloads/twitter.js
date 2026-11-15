"use strict";

const kit = require("../../libs/pluginkit");
const dl = require("../../libs/dlkit");

function providers(url) {
  const enc = encodeURIComponent(url);
  return [
    async () => {
      const res = await dl.getJson(`${dl.api("delirius").url}/download/twitterdl?url=${enc}`);
      if (!res?.found || !res.media?.length) return null;
      return {
        type: res.type || "video",
        url: res.media[0].url,
        title: res.info?.text || null,
        author: res.info?.user_name || res.info?.user_screen_name || null,
        date: res.info?.date || null,
        likes: res.info?.likes || null,
        retweets: res.info?.retweets || null
      };
    },
    async () => {
      const res = await dl.getJson(`${dl.api("zenzxz").url}/download/twitter?url=${enc}`);
      if (!res?.status || !res.result?.length) return null;
      const list = res.result;
      const media = list.find((x) => /1080|HD/i.test(x.quality || "")) || list.find((x) => /720/.test(x.quality || "")) || list[0];
      return media?.url ? { type: "video", url: media.url, resolution: media.quality || null } : null;
    },
    async () => {
      const res = await dl.getJson(`${dl.api("siputzx").url}/api/d/twitter`, { params: { url } });
      const found = dl.deepFind(res, ["hd", "sd", "url", "download", "dl"]);
      return found ? { type: /\.(jpg|jpeg|png)/i.test(found) ? "image" : "video", url: found } : null;
    }
  ];
}

module.exports = dl.define({
  commands: ["twitter", "x"],
  description: "Descargar un video/imagen de Twitter/X.",
  run: async ({ sock, msg, chatId, args }) => {
    if (!args[0]) return kit.reply(sock, msg, "《✧》 Por favor, ingrese un enlace de Twitter/X.");
    if (!/(twitter|x)\.com\/\w+\/status\//i.test(args[0])) {
      return kit.reply(sock, msg, "《✧》 El enlace no parece válido. Asegúrate de que sea de Twitter/X.");
    }
    await kit.react(sock, msg, "✧");
    const data = await dl.chain(providers(args[0]));
    if (!data?.url) return kit.reply(sock, msg, "《✧》 No se pudo obtener el contenido.");
    const caption = dl.cap("Twitter Download", [
      ["Título", data.title],
      ["Autor", data.author],
      ["Fecha", data.date],
      ["Resolución", data.resolution],
      ["Likes", data.likes],
      ["Retweets", data.retweets],
      ["Enlace", args[0]]
    ]);
    if (data.type === "image") await sock.sendMessage(chatId, { image: { url: data.url }, caption }, { quoted: msg });
    else await sock.sendMessage(chatId, { video: { url: data.url }, caption, mimetype: "video/mp4", fileName: "twitter.mp4" }, { quoted: msg });
    return kit.react(sock, msg, "✔");
  }
});
