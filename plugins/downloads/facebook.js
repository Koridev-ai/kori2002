"use strict";

const kit = require("../../libs/pluginkit");
const dl = require("../../libs/dlkit");

const unescapeJson = (s) =>
  String(s || "")
    .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&");

async function scrape(url) {
  const page = await dl.getText(url, {
    headers: { "Accept-Language": "es-ES,es;q=0.9,en;q=0.8", Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    timeout: 45000
  });
  const html = page.body;
  const hd = html.match(/"browser_native_hd_url":"((?:\\.|[^"\\])+)"/)?.[1];
  const sd = html.match(/"browser_native_sd_url":"((?:\\.|[^"\\])+)"/)?.[1];
  const best = unescapeJson(hd || sd || "");
  if (!best) return null;
  const title = html.match(/property="og:title" content="([^"]+)"/i)?.[1] || null;
  return { type: "video", url: best, title: title ? unescapeJson(title) : null, resolution: hd ? "HD" : "SD" };
}

function providers(url) {
  const enc = encodeURIComponent(url);
  return [
    () => scrape(url),
    async () => {
      const res = await dl.getJson(`${dl.api("delirius").url}/download/facebook?url=${enc}`);
      const found = res?.urls?.[0]?.hd || res?.urls?.[0]?.sd || dl.deepFind(res, ["hd", "sd", "url"]);
      return found ? { type: "video", url: found, title: res?.title || null, resolution: res?.urls?.[0]?.hd ? "HD" : "SD" } : null;
    },
    async () => {
      const res = await dl.getJson(`${dl.api("zenzxz").url}/download/facebook?url=${enc}`);
      const found = dl.deepFind(res, ["hd", "sd", "url", "download"]);
      return found ? { type: "video", url: found } : null;
    },
    async () => {
      const res = await dl.getJson(`${dl.api("siputzx").url}/api/d/facebook`, { params: { url } });
      const found = dl.deepFind(res, ["hd", "sd", "url", "download", "dl"]);
      return found ? { type: "video", url: found } : null;
    }
  ];
}

module.exports = dl.define({
  commands: ["fb", "facebook"],
  description: "Descargar un video de Facebook.",
  run: async ({ sock, msg, chatId, args }) => {
    if (!args[0]) return kit.reply(sock, msg, "《✧》 Por favor, Ingrese un enlace de Facebook.");
    if (!/facebook\.com|fb\.watch|video\.fb\.com/i.test(args[0])) {
      return kit.reply(sock, msg, "《✧》 El enlace es invalido, envía un link de Facebook válido");
    }
    await kit.react(sock, msg, "✧");
    const data = await dl.chain(providers(args[0]));
    if (!data?.url) return kit.reply(sock, msg, "《✧》 No se pudo obtener el contenido.");
    const caption = dl.cap("Facebook Download", [["Titulo", data.title], ["Resolución", data.resolution], ["Enlace", args[0]]]);
    await sock.sendMessage(chatId, { video: { url: data.url }, caption, mimetype: "video/mp4", fileName: "fb.mp4" }, { quoted: msg });
    return kit.react(sock, msg, "✔");
  }
});
