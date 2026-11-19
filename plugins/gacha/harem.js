"use strict";

const axios = require("axios");
const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const yandere = require("../../libs/yandere");
const { sendRichHtml } = require("../../libs/richhtml");

const PER_PAGE = 8;
const TEXT_PER_PAGE = 20;
const MAX_DOWNLOAD_BYTES = 4 * 1024 * 1024;
const MAX_EMBED_BYTES = 450 * 1024;
const IMAGE_TIMEOUT_MS = 9000;
const IMAGE_CACHE_LIMIT = 40;

const imageCache = new Map();

function esc(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mimeOf(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.length > 4 && buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf.length > 12 && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length > 3 && buf.toString("ascii", 0, 3) === "GIF") return "image/gif";
  return "image/jpeg";
}

async function shrink(buf) {
  if (buf.length <= MAX_EMBED_BYTES) return buf;
  try {
    const { Jimp } = require("jimp");
    const img = await Jimp.read(buf);
    if (img.bitmap.width > 360) img.resize({ w: 360 });
    return await img.getBuffer("image/jpeg", { quality: 72 });
  } catch {
    return null;
  }
}

async function featuredImage(character) {
  if (!character) return null;
  if (imageCache.has(character.id)) return imageCache.get(character.id);
  let uri = null;
  try {
    const post = await yandere.getRandomPost(character.tag);
    if (post && post.url) {
      const res = await axios.get(post.url, {
        responseType: "arraybuffer",
        timeout: IMAGE_TIMEOUT_MS,
        maxContentLength: MAX_DOWNLOAD_BYTES,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      let buf = Buffer.from(res.data);
      buf = await shrink(buf);
      if (buf && buf.length <= MAX_EMBED_BYTES * 2) uri = `data:${mimeOf(buf)};base64,${buf.toString("base64")}`;
    }
  } catch {
    uri = null;
  }
  if (uri) {
    if (imageCache.size >= IMAGE_CACHE_LIMIT) imageCache.delete(imageCache.keys().next().value);
    imageCache.set(character.id, uri);
  }
  return uri;
}

function initialOf(name) {
  const ch = String(name || "?").trim().charAt(0).toUpperCase();
  return esc(ch || "?");
}

function buildHtml(o) {
  const pct = o.catalog > 0 ? Math.min(100, Math.max(2, Math.round((o.owned / o.catalog) * 100))) : 2;

  let featured = "";
  if (o.featured) {
    const f = o.featured;
    const imgHtml = o.featuredImage
      ? `<div class="fimg"><img src="${o.featuredImage}" alt=""></div>`
      : `<div class="fimg ph">✦</div>`;
    const star = f.id === o.primaryId ? `<span class="chip fav">★ Favorito</span>` : "";
    featured = `
    <div class="feature">
      ${imgHtml}
      <div class="finfo">
        <div class="fkicker">Destacado</div>
        <div class="fname">${esc(f.name)}</div>
        <div class="fsub">${esc(f.series)}</div>
        <div class="fid">ID ${esc(f.id)}</div>
        <div class="tags">${star}</div>
        <div class="fvalue">${esc(eco.money(f.value))}</div>
      </div>
    </div>`;
  }

  let rows = "";
  let n = (o.page - 1) * PER_PAGE;
  for (const c of o.pageItems) {
    n++;
    const mark = c.id === o.primaryId ? "★ " : "";
    rows += `
    <div class="row">
      <div class="rank">${n}</div>
      <div class="rmeta">
        <div class="rname">${mark}${esc(c.name)}</div>
        <div class="rser">${esc(c.series)}</div>
      </div>
      <div class="rright">
        <div class="rval">${esc(eco.money(c.value))}</div>
      </div>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#dbeafe;color:#0f172a;padding:14px}
.wrap{max-width:520px;margin:0 auto;background:linear-gradient(180deg,#f8fbff,#e0f2fe);border:1px solid #bae6fd;border-radius:26px;padding:16px;box-shadow:0 8px 28px rgba(14,116,144,.18)}
.banner{background:linear-gradient(120deg,#0ea5e9,#38bdf8 55%,#a5f3fc);border-radius:20px;padding:18px;color:#fff}
.bkick{font-size:12px;letter-spacing:3px;text-transform:uppercase;opacity:.9}
.bname{font-size:26px;font-weight:800;margin-top:4px;word-break:break-word}
.bsub{font-size:13px;margin-top:2px;opacity:.95}
.tiles{display:flex;gap:10px;margin:14px 0}
.tile{flex:1;background:#fff;border:1px solid #bae6fd;border-radius:16px;padding:12px;text-align:center}
.tile .n{font-size:20px;font-weight:800;color:#0369a1}
.tile .l{font-size:12px;color:#64748b;margin-top:2px}
.seg{display:flex;height:12px;border-radius:999px;overflow:hidden;background:#e2e8f0}
.seg i{display:block;height:100%;background:linear-gradient(90deg,#38bdf8,#0ea5e9);border-radius:999px}
.prog{font-size:13px;color:#475569;margin:8px 2px 16px}
.chip{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800}
.chip.fav{background:#fef3c7;color:#92400e}
.feature{display:flex;gap:14px;background:#fff;border:1px solid #bae6fd;border-radius:20px;padding:12px;margin-bottom:16px}
.fimg{width:130px;height:180px;border-radius:14px;overflow:hidden;background:#e0f2fe;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.fimg img{width:100%;height:100%;object-fit:cover}
.ph{color:#38bdf8;font-size:28px}
.finfo{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}
.fkicker{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#0ea5e9;font-weight:800}
.fname{font-size:21px;font-weight:800;margin-top:4px;line-height:1.15;word-break:break-word}
.fsub{font-size:13px;color:#475569;margin-top:4px}
.fid{font-size:12px;color:#94a3b8;margin-top:2px}
.tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.fvalue{font-size:17px;font-weight:800;color:#0369a1;margin-top:10px}
.row{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #e0f2fe;border-radius:14px;padding:10px 12px;margin-bottom:8px}
.rank{width:30px;height:30px;border-radius:50%;background:#e0f2fe;color:#0369a1;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rmeta{flex:1;min-width:0}
.rname{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rser{font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rright{text-align:right;flex-shrink:0}
.rval{font-size:13px;font-weight:800;color:#0369a1}
.foot{text-align:center;font-size:12px;color:#64748b;margin-top:12px;line-height:1.6}
</style>
</head>
<body>
<div class="wrap">
  <div class="banner">
    <div class="bkick">Kori · Harem</div>
    <div class="bname">${esc(o.name)}</div>
    <div class="bsub">Colección de personajes reclamados</div>
  </div>
  <div class="tiles">
    <div class="tile"><div class="n">${o.owned}</div><div class="l">Personajes</div></div>
    <div class="tile"><div class="n">${o.catalog}</div><div class="l">En el catálogo</div></div>
    <div class="tile"><div class="n">${esc(eco.money(o.totalValue))}</div><div class="l">Valor total</div></div>
  </div>
  <div class="seg"><i style="width:${pct}%"></i></div>
  <div class="prog">${o.owned} de ${o.catalog} personajes del catálogo</div>
  ${featured}
  ${rows}
  <div class="foot">Página ${o.page} de ${o.pages}<br>${esc(o.prefix)}${esc(o.command)} &lt;página&gt;</div>
</div>
</body>
</html>`;
}

function textHarem({ name, owned, primaryId, page, totalPages, usedPrefix, command }) {
  const start = (page - 1) * TEXT_PER_PAGE;
  const end = Math.min(start + TEXT_PER_PAGE, owned.length);
  let message = `✿ Personajes reclamados ✿\n⌦ Usuario: *${name}*\n♡ Personajes: *(${owned.length})*\n\n`;
  for (let i = start; i < end; i++) {
    const c = owned[i];
    message += `${c.id === primaryId ? "★" : "»"} *${c.name}* \`${c.id}\` (*${eco.money(c.value)}*)\n`;
  }
  message += `\n⌦ _Página *${page}* de *${totalPages}*_`;
  if (page < totalPages) message += `\n> Usa *${usedPrefix}${command} ${page + 1}* para ver la siguiente página.`;
  return message.trim();
}

module.exports = gacha.define({
  commands: ["harem", "waifus", "claims"],
  description: "Muestra los personajes reclamados de un usuario.",
  run: async ({ sock, msg, chatId, id, args, usedPrefix, command }) => {
    const t = gacha.target(msg);
    const targetId = t ? t.id : id;
    const targetJid = t ? t.jid : gacha.mentionJid(id);
    const name = gacha.displayName(targetId);

    const owned = gacha.getUserCharacters(targetId);
    if (!owned.length) {
      const text = targetId === id ? "ꕥ No tienes personajes reclamados." : `ꕥ *${name}* no tiene personajes reclamados.`;
      return sock.sendMessage(chatId, { text, mentions: [targetJid] }, { quoted: msg });
    }

    const primaryId = gacha.getPrimaryCharacter(targetId);
    const pageArg = args.find((a) => /^\d+$/.test(a));
    const page = pageArg ? parseInt(pageArg, 10) : 1;

    const sorted = [...owned].sort((a, b) => String(a.series).localeCompare(String(b.series)) || b.value - a.value);
    const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
    if (page < 1 || page > pages) return kit.reply(sock, msg, `❀ Página no válida. Hay un total de *${pages}* páginas.`);

    try {
      let featured = null;
      if (page === 1) {
        featured = owned.find((c) => c.id === primaryId) || owned[0] || null;
      }
      const featuredImg = featured ? await featuredImage(featured) : null;

      const start = (page - 1) * PER_PAGE;
      const html = buildHtml({
        name,
        owned: owned.length,
        catalog: gacha.countCharacters(),
        totalValue: owned.reduce((sum, c) => sum + (c.value || 0), 0),
        featured,
        featuredImage: featuredImg,
        primaryId,
        pageItems: sorted.slice(start, start + PER_PAGE),
        page,
        pages,
        prefix: usedPrefix,
        command
      });

      await sendRichHtml(sock, chatId, "✦ Harem", "HAREM", html);
      return;
    } catch (error) {
      console.error("[harem] fallo la tarjeta HTML, se usa texto:", error);
    }

    const textPages = Math.max(1, Math.ceil(owned.length / TEXT_PER_PAGE));
    const textPage = Math.min(page, textPages);
    const text = textHarem({ name, owned, primaryId, page: textPage, totalPages: textPages, usedPrefix, command });
    return sock.sendMessage(chatId, { text, mentions: [targetJid] }, { quoted: msg });
  }
});
