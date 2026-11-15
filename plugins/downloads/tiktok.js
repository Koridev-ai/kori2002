"use strict";

const kit = require("../../libs/pluginkit");
const dl = require("../../libs/dlkit");

const URL_RE = /(?:https?:\/\/)?(?:www\.|vm\.|vt\.|m\.)?tiktok\.com\/\S+/i;

function describe(v) {
  return dl.cap("TikTok Download", [
    ["Título", v.title || "Sin título"],
    ["Autor", `${v.author?.nickname || "Desconocido"}${v.author?.unique_id ? ` @${v.author.unique_id}` : ""}`],
    ["Duración", v.duration ? `${v.duration}s` : null],
    ["Likes", Number(v.digg_count || 0).toLocaleString()],
    ["Comentarios", Number(v.comment_count || 0).toLocaleString()],
    ["Vistas", Number(v.play_count || 0).toLocaleString()],
    ["Compartidos", Number(v.share_count || 0).toLocaleString()],
    ["Audio", v.music_info?.title || null]
  ]);
}

async function tikwm(path, form) {
  const base = dl.api("tikwm").url;
  const body = new URLSearchParams(form).toString();
  for (let attempt = 0; attempt < 3; attempt++) {
    const json = await dl.getJson(`${base}${path}`, { method: "post", data: body, headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" } });
    if (json && json.code === 0) return json.data;
    if (!/limit/i.test(String(json?.msg))) return null;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

module.exports = dl.define({
  commands: ["tiktok", "tt"],
  description: "Descargar un video de TikTok.",
  run: async ({ sock, msg, chatId, text }) => {
    if (!text) return kit.reply(sock, msg, "《✧》 Por favor, ingresa un término de búsqueda o enlace de TikTok.");
    await kit.react(sock, msg, "✧");
    const link = text.match(URL_RE);

    if (link) {
      const data = await tikwm("/api/", { url: link[0], hd: "1" });
      if (!data) return kit.reply(sock, msg, "《✧》 No se encontró contenido válido en TikTok.");
      const caption = describe(data);
      if (Array.isArray(data.images) && data.images.length) {
        const items = data.images.slice(0, 10).map((url, i) => ({ type: "image", data: { url }, caption: i === 0 ? caption : "" }));
        await dl.sendAlbum(sock, chatId, items, msg);
        if (data.music) await sock.sendMessage(chatId, { audio: { url: data.music }, mimetype: "audio/mp4", fileName: "tiktok_audio.mp4" }, { quoted: msg });
      } else {
        const url = data.hdplay || data.play;
        if (!url) return kit.reply(sock, msg, "《✧》 Enlace inválido o sin contenido descargable.");
        await sock.sendMessage(chatId, { video: { url }, caption }, { quoted: msg });
      }
      return kit.react(sock, msg, "✔");
    }

    const data = await tikwm("/api/feed/search", { keywords: text, count: "10", cursor: "0", HD: "1" });
    const videos = (data?.videos || []).filter((v) => v.play);
    if (videos.length < 2) return kit.reply(sock, msg, "《✧》 Se requieren al menos 2 resultados válidos con contenido.");
    const items = videos.slice(0, 10).map((v) => ({ type: "video", data: { url: v.play }, caption: describe(v) }));
    await dl.sendAlbum(sock, chatId, items, msg);
    return kit.react(sock, msg, "✔");
  }
});
