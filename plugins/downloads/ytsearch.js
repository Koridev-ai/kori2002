"use strict";

const kit = require("../../libs/pluginkit");
const dl = require("../../libs/dlkit");

module.exports = dl.define({
  commands: ["ytsearch", "search", "yts"],
  description: "Buscar videos de YouTube.",
  run: async ({ sock, msg, chatId, text }) => {
    if (!text) return kit.reply(sock, msg, "《✧》 Por favor, Ingrese el título de un vídeo.");
    let yts;
    try {
      yts = require("yt-search");
    } catch {
      throw new Error("Falta el módulo yt-search. Instálalo con: npm install yt-search");
    }
    const res = await yts(text);
    const all = (res.all || []).slice(0, 10);
    if (!all.length) return kit.reply(sock, msg, "《✧》 No se encontraron resultados.");
    const list = all
      .map((v) => {
        if (v.type === "video") return `➩ *Título ›* *${v.title}*\n\n> ⴵ *Duración ›* ${v.timestamp}\n> ❖ *Subido ›* ${v.ago}\n> ✿ *Vistas ›* ${v.views}\n> ❒ *Url ›* ${v.url}`;
        if (v.type === "channel") return `> ❖ Canal › *${v.name}*\n> ❒ Url › ${v.url}\n> ❀ Subscriptores › ${v.subCountLabel} (${v.subCount})\n> ✿ Videos totales › ${v.videoCount}`;
        return null;
      })
      .filter(Boolean)
      .join("\n\n╾۪〬─ ┄۫╌ ׄ┄┈۪ ─〬 ׅ┄╌ ۫┈ ─ׄ─۪〬 ┈ ┄۫╌ ─ׄ〬╼\n\n");
    const thumb = all[0].image || all[0].thumbnail;
    if (thumb) {
      try {
        const buffer = await dl.getBuffer(thumb, { timeout: 20000 });
        return sock.sendMessage(chatId, { image: buffer, caption: list }, { quoted: msg });
      } catch {}
    }
    return kit.reply(sock, msg, list);
  }
});
