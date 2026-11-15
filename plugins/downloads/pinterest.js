"use strict";

const kit = require("../../libs/pluginkit");
const dl = require("../../libs/dlkit");

async function download(url) {
  const res = await dl.getJson(`${dl.api("fare").url}/dl/pin`, { params: { url } });
  const data = res?.status && res.resultado;
  if (!data?.url) return null;
  const isVideo = /\.mp4(?:$|\?)/i.test(data.filename || "") || /\.mp4(?:$|\?)/i.test(data.url);
  return { type: isVideo ? "video" : "image", url: data.url, title: data.titulo || null, author: data.autor || null, filename: data.filename || (isVideo ? "pin.mp4" : "pin.jpg") };
}

async function search(query) {
  const res = await dl.getJson(`${dl.api("fare").url}/search/pin`, { params: { q: query, limit: 20 } });
  if (!res?.status || !Array.isArray(res.results)) return [];
  return res.results
    .filter((d) => d?.descarga)
    .map((d) => ({
      type: String(d.tipo || "").toLowerCase() === "video" || /\.mp4(?:$|\?)/i.test(d.descarga) ? "video" : "image",
      url: d.descarga,
      title: d.titulo || null,
      author: d.autor || null,
      link: d.url || null
    }));
}

module.exports = dl.define({
  commands: ["pinterest", "pin"],
  description: "Buscar y descarga imágenes y videos de Pinterest.",
  run: async ({ sock, msg, chatId, text }) => {
    if (!text) return kit.reply(sock, msg, "《✧》 Por favor, ingresa un término de búsqueda o un enlace de Pinterest.");
    await kit.react(sock, msg, "✧");
    if (/^https?:\/\//i.test(text)) {
      const data = await download(text);
      if (!data) return kit.reply(sock, msg, "ꕥ No se pudo obtener el contenido.");
      const caption = dl.cap("Pinterest Download", [["Título", data.title], ["Autor", data.author], ["Enlace", text]]);
      if (data.type === "video") await sock.sendMessage(chatId, { video: { url: data.url }, caption, mimetype: "video/mp4", fileName: data.filename }, { quoted: msg });
      else await sock.sendMessage(chatId, { image: { url: data.url }, caption }, { quoted: msg });
      return kit.react(sock, msg, "✔");
    }
    const results = await search(text);
    if (!results.length) return kit.reply(sock, msg, `《✧》 No se encontraron resultados para *${text}*.`);
    const items = results.slice(0, 10).map((r) => ({
      type: r.type,
      data: { url: r.url },
      caption: dl.cap("Pinterest Search", [["Título", r.title], ["Autor", r.author], ["Enlace", r.link], ["Búsqueda", text]])
    }));
    await dl.sendAlbum(sock, chatId, items, msg);
    return kit.react(sock, msg, "✔");
  }
});
