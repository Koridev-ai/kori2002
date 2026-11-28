"use strict";

const axios = require("axios");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const yandere = require("../../libs/yandere");
const fs = require("fs");
const path = require("path");
const { sendRichHtml } = require("../../libs/richhtml");
const { buildHaremHtml } = require("../../libs/haremhtml");
const harembg = require("../../libs/harembg");

const PER_PAGE = 8;
const TEXT_PER_PAGE = 20;
const MAX_DOWNLOAD_BYTES = 6 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 9000;
const IMAGE_CACHE_LIMIT = 40;
const FONT = "sans-serif";

const W = 900;
const PAD = 36;
const ROW_H = 84;

const imageCache = new Map();

const RICH_ENABLED = process.env.HAREM_RICH !== "off";
const IMAGE_MODE = process.env.HAREM_IMAGES === "remote" ? "remote" : "inline";
const RICH_MAX_IMAGES = Math.max(0, Number(process.env.HAREM_MAX_IMAGES) || 30);
const RICH_FETCH_BUDGET_MS = 9000;
const MAX_HTML_BYTES = Math.max(60000, Number(process.env.HAREM_MAX_BYTES) || 450000);
const THUMB_W = 240;
const THUMB_H = 320;
const BIG_W = 300;
const BIG_H = 400;
const FULL_MAX = Math.max(240, Number(process.env.HAREM_FULL_SIZE) || 640);
const FULL_COUNT = Math.max(0, process.env.HAREM_FULL_IMAGES === undefined ? 1 : Number(process.env.HAREM_FULL_IMAGES) || 0);
const REMOTE_HOSTS = ["files.yande.re", "assets.yande.re", "yande.re"];
const URL_FILE = path.resolve(__dirname, "..", "..", "src", "haremimg.json");

let urlStore = null;
let urlTimer = null;
const thumbCache = new Map();
const THUMB_CACHE_LIMIT = 300;

function loadUrls() {
  if (urlStore) return urlStore;
  try {
    urlStore = fs.existsSync(URL_FILE) ? JSON.parse(fs.readFileSync(URL_FILE, "utf-8")) : {};
  } catch {
    urlStore = {};
  }
  return urlStore;
}

function saveUrls() {
  if (urlTimer) return;
  urlTimer = setTimeout(() => {
    urlTimer = null;
    try {
      fs.writeFileSync(URL_FILE, JSON.stringify(loadUrls()));
    } catch (error) {
      console.error("[harem] no se pudo guardar haremimg.json:", error.message);
    }
  }, 3000);
  if (urlTimer.unref) urlTimer.unref();
}

async function resolveImageUrl(character) {
  const store = loadUrls();
  if (store[character.id]) return store[character.id];
  try {
    const post = await yandere.getRandomPost(character.tag);
    if (post && post.url) {
      store[character.id] = post.url;
      saveUrls();
      return post.url;
    }
  } catch {
    return null;
  }
  return null;
}

async function makeThumb(url, w, h, quality) {
  const key = `${url}|${w}x${h}`;
  if (thumbCache.has(key)) return thumbCache.get(key);
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: IMAGE_TIMEOUT_MS,
    maxContentLength: MAX_DOWNLOAD_BYTES,
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const img = await loadImage(Buffer.from(res.data));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  const uri = `data:image/jpeg;base64,${canvas.toBuffer("image/jpeg", quality).toString("base64")}`;
  if (thumbCache.size >= THUMB_CACHE_LIMIT) thumbCache.delete(thumbCache.keys().next().value);
  thumbCache.set(key, uri);
  return uri;
}

async function makeFull(url, maxSide, quality) {
  const key = `${url}|full${maxSide}`;
  if (thumbCache.has(key)) return thumbCache.get(key);
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: IMAGE_TIMEOUT_MS,
    maxContentLength: MAX_DOWNLOAD_BYTES,
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const img = await loadImage(Buffer.from(res.data));
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = createCanvas(w, h);
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  const uri = `data:image/jpeg;base64,${canvas.toBuffer("image/jpeg", quality).toString("base64")}`;
  if (thumbCache.size >= THUMB_CACHE_LIMIT) thumbCache.delete(thumbCache.keys().next().value);
  thumbCache.set(key, uri);
  return uri;
}

async function collectImages(candidates, featuredId) {
  const out = new Map();
  const picked = candidates.slice(0, RICH_MAX_IMAGES);
  const work = picked.map(async (c, index) => {
    try {
      const url = await resolveImageUrl(c);
      if (!url) return;
      if (IMAGE_MODE === "remote") {
        out.set(c.id, { img: url });
        return;
      }
      const img = await makeThumb(url, THUMB_W, THUMB_H, 62);
      const entry = { img };
      if (c.id === featuredId) entry.big = await makeThumb(url, BIG_W, BIG_H, 72);
      if (index < FULL_COUNT) entry.full = await makeFull(url, FULL_MAX, 68);
      out.set(c.id, entry);
    } catch {
      return;
    }
  });
  await Promise.race([Promise.allSettled(work), new Promise((resolve) => setTimeout(resolve, RICH_FETCH_BUDGET_MS))]);
  return out;
}

const MEDIA_DIR = path.resolve(__dirname, "..", "..", "media");
const BG_W = 480;
const BG_H = 860;
let bgCache = { key: null, uri: null };

function findBackgroundFile() {
  if (process.env.HAREM_BG) {
    const custom = path.isAbsolute(process.env.HAREM_BG) ? process.env.HAREM_BG : path.resolve(__dirname, "..", "..", process.env.HAREM_BG);
    return fs.existsSync(custom) ? custom : null;
  }
  for (const name of ["haremfondo.jpg", "haremfondo.jpeg", "haremfondo.png", "haremfondo.webp"]) {
    const file = path.join(MEDIA_DIR, name);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

async function loadBackground() {
  try {
    const file = findBackgroundFile();
    if (!file) return null;
    const key = `${file}|${fs.statSync(file).mtimeMs}`;
    if (bgCache.key === key) return bgCache.uri;
    const img = await loadImage(fs.readFileSync(file));
    const canvas = createCanvas(BG_W, BG_H);
    const ctx = canvas.getContext("2d");
    const scale = Math.max(BG_W / img.width, BG_H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (BG_W - dw) / 2, (BG_H - dh) / 2, dw, dh);
    const uri = `data:image/jpeg;base64,${canvas.toBuffer("image/jpeg", 55).toString("base64")}`;
    bgCache = { key, uri };
    return uri;
  } catch (error) {
    console.error("[harem] no se pudo cargar el fondo:", error.message);
    return null;
  }
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

async function buildRichHarem({ name, owned, primaryId, targetId }) {
  const sorted = [...owned].sort((a, b) => String(a.series).localeCompare(String(b.series)) || b.value - a.value);
  const featuredId = primaryId && owned.some((c) => c.id === primaryId) ? primaryId : sorted[0].id;
  const priority = [...sorted].sort((a, b) => (a.id === featuredId ? -1 : b.id === featuredId ? 1 : 0));
  const images = await collectImages(priority, featuredId);

  const rankMap = new Map();
  gacha.getCharactersByValue().forEach((c, i) => rankMap.set(c.id, i + 1));

  const items = sorted.map((c) => {
    const entry = images.get(c.id) || {};
    return {
      i: c.id,
      n: c.name,
      s: c.series,
      g: c.gender || "",
      v: c.value,
      vf: eco.money(c.value),
      vs: eco.money(c.value).split(" ")[0],
      fav: c.id === primaryId,
      d: formatDate(c.claimedAt),
      k: rankMap.get(c.id) || 0,
      img: entry.img || null,
      big: entry.big || null,
      full: entry.full || null
    };
  });

  const bgUri = harembg.load(targetId) || (await loadBackground());
  const state = { bg: bgUri };
  const totalValue = eco.money(owned.reduce((sum, c) => sum + (c.value || 0), 0));
  const render = () =>
    buildHaremHtml({
      owner: name,
      catalog: gacha.countCharacters(),
      total: totalValue,
      prefix: global.prefix || ".",
      featured: featuredId,
      bg: state.bg,
      items
    });

  let html = render();
  const reducers = [
    () => items.forEach((x) => { x.full = null; }),
    () => { state.bg = null; },
    () => items.forEach((x) => { x.big = null; }),
    () => items.forEach((x, i) => { if (i >= 8 && x.i !== featuredId) x.img = null; }),
    () => items.forEach((x) => { if (x.i !== featuredId) x.img = null; })
  ];
  for (const reduce of reducers) {
    if (Buffer.byteLength(html) <= MAX_HTML_BYTES) break;
    reduce();
    html = render();
  }
  console.log(`[harem] html ${Buffer.byteLength(html)} bytes, ${items.length} personajes`);
  return html;
}

function richFallbackText({ name, owned, primaryId, usedPrefix, command }) {
  const shown = owned.slice(0, TEXT_PER_PAGE);
  const total = eco.money(owned.reduce((sum, c) => sum + (c.value || 0), 0));
  let text = `Harem de ${name}\nPersonajes: ${owned.length} · Valor total: ${total}\n\n`;
  for (const c of shown) text += `${c.id === primaryId ? "★" : "»"} ${c.name} (${eco.money(c.value)})\n`;
  if (owned.length > shown.length) text += `\n… y ${owned.length - shown.length} más.`;
  text += `\nUsa ${usedPrefix}${command} img para verlo como imagen.`;
  return text.trim();
}

async function sendRichHarem({ sock, msg, chatId, name, owned, primaryId, targetId, usedPrefix, command }) {
  const html = await buildRichHarem({ name, owned, primaryId, targetId });
  const trustedSources = IMAGE_MODE === "remote" ? REMOTE_HOSTS : [];
  const text = richFallbackText({ name, owned, primaryId, usedPrefix, command });
  await sendRichHtml(sock, chatId, `Harem de ${name}`, html, { trustedSources, quoted: msg, text });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fit(ctx, text, maxWidth) {
  let t = String(text === undefined || text === null ? "" : text);
  if (ctx.measureText(t).width <= maxWidth) return t;
  while (t.length > 1 && ctx.measureText(t + "...").width > maxWidth) t = t.slice(0, -1);
  return t + "...";
}

function drawStar(ctx, cx, cy, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCover(ctx, img, x, y, w, h, r) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

async function featuredImage(character, fresh) {
  if (!character) return null;
  if (!fresh && imageCache.has(character.id)) return imageCache.get(character.id);
  let img = null;
  try {
    const post = await yandere.getRandomPost(character.tag);
    if (post && post.url) {
      const res = await axios.get(post.url, {
        responseType: "arraybuffer",
        timeout: IMAGE_TIMEOUT_MS,
        maxContentLength: MAX_DOWNLOAD_BYTES,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      img = await loadImage(Buffer.from(res.data));
    }
  } catch {
    img = null;
  }
  if (img) {
    if (imageCache.size >= IMAGE_CACHE_LIMIT) imageCache.delete(imageCache.keys().next().value);
    imageCache.set(character.id, img);
  }
  return img;
}

function renderCard(o) {
  const featuredH = o.featured ? 300 : 0;
  const rowsH = o.pageItems.length * ROW_H;
  const H = PAD + 150 + 20 + 110 + 20 + 76 + (o.featured ? featuredH + 20 : 0) + rowsH + 70 + PAD;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "alphabetic";

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#dbeafe");
  bg.addColorStop(1, "#bae6fd");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const cx = PAD;
  const cw = W - PAD * 2;
  let y = PAD;

  const banner = ctx.createLinearGradient(cx, y, cx + cw, y + 150);
  banner.addColorStop(0, "#0ea5e9");
  banner.addColorStop(0.6, "#38bdf8");
  banner.addColorStop(1, "#a5f3fc");
  ctx.fillStyle = banner;
  roundRect(ctx, cx, y, cw, 150, 30);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText("KORI  |  HAREM", cx + 32, y + 46);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 46px ${FONT}`;
  ctx.fillText(fit(ctx, o.name, cw - 64), cx + 32, y + 98);
  ctx.font = `24px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText("Colección de personajes reclamados", cx + 32, y + 132);
  y += 150 + 20;

  const tiles = [
    { n: String(o.owned), l: "Personajes" },
    { n: String(o.catalog), l: "En el catálogo" },
    { n: eco.money(o.totalValue), l: "Valor total" }
  ];
  const gap = 16;
  const tw = (cw - gap * 2) / 3;
  tiles.forEach((tile, i) => {
    const tx = cx + i * (tw + gap);
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, tx, y, tw, 110, 22);
    ctx.fill();
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = "#0369a1";
    ctx.font = `bold 34px ${FONT}`;
    ctx.fillText(fit(ctx, tile.n, tw - 24), tx + tw / 2, y + 56);
    ctx.fillStyle = "#64748b";
    ctx.font = `22px ${FONT}`;
    ctx.fillText(tile.l, tx + tw / 2, y + 90);
    ctx.textAlign = "left";
  });
  y += 110 + 20;

  const pct = o.catalog > 0 ? Math.min(1, Math.max(0.02, o.owned / o.catalog)) : 0.02;
  ctx.fillStyle = "#e2e8f0";
  roundRect(ctx, cx, y, cw, 18, 9);
  ctx.fill();
  const barGrad = ctx.createLinearGradient(cx, 0, cx + cw, 0);
  barGrad.addColorStop(0, "#38bdf8");
  barGrad.addColorStop(1, "#0ea5e9");
  ctx.fillStyle = barGrad;
  roundRect(ctx, cx, y, Math.max(18, cw * pct), 18, 9);
  ctx.fill();
  ctx.fillStyle = "#475569";
  ctx.font = `22px ${FONT}`;
  ctx.fillText(`${o.owned} de ${o.catalog} personajes del catálogo`, cx + 4, y + 50);
  y += 76;

  if (o.featured) {
    const f = o.featured;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, cx, y, cw, featuredH, 26);
    ctx.fill();
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 2;
    ctx.stroke();

    const ix = cx + 20;
    const iy = y + 20;
    const iw = 190;
    const ih = featuredH - 40;
    if (o.featuredImage) {
      drawCover(ctx, o.featuredImage, ix, iy, iw, ih, 18);
    } else {
      ctx.fillStyle = "#e0f2fe";
      roundRect(ctx, ix, iy, iw, ih, 18);
      ctx.fill();
      drawStar(ctx, ix + iw / 2, iy + ih / 2, 34, "#7dd3fc");
    }

    const tx = ix + iw + 28;
    const tmax = cx + cw - 24 - tx;
    ctx.fillStyle = "#0ea5e9";
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText("DESTACADO", tx, iy + 28);
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold 40px ${FONT}`;
    ctx.fillText(fit(ctx, f.name, tmax), tx, iy + 84);
    ctx.fillStyle = "#475569";
    ctx.font = `26px ${FONT}`;
    ctx.fillText(fit(ctx, f.series, tmax), tx, iy + 128);
    ctx.fillStyle = "#94a3b8";
    ctx.font = `22px ${FONT}`;
    ctx.fillText(fit(ctx, `ID ${f.id}`, tmax), tx, iy + 162);
    ctx.fillStyle = "#0369a1";
    ctx.font = `bold 34px ${FONT}`;
    ctx.fillText(fit(ctx, eco.money(f.value), tmax), tx, iy + 222);

    if (f.id === o.primaryId) {
      ctx.fillStyle = "#fef3c7";
      roundRect(ctx, tx, iy + 238, 150, 34, 17);
      ctx.fill();
      drawStar(ctx, tx + 22, iy + 255, 11, "#d97706");
      ctx.fillStyle = "#92400e";
      ctx.font = `bold 20px ${FONT}`;
      ctx.fillText("Favorito", tx + 42, iy + 262);
    }
    y += featuredH + 20;
  }

  let n = (o.page - 1) * PER_PAGE;
  for (const c of o.pageItems) {
    n++;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, cx, y, cw, ROW_H - 10, 20);
    ctx.fill();
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 2;
    ctx.stroke();

    const rcy = y + (ROW_H - 10) / 2;
    ctx.fillStyle = "#e0f2fe";
    ctx.beginPath();
    ctx.arc(cx + 44, rcy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0369a1";
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(String(n), cx + 44, rcy + 8);
    ctx.textAlign = "left";

    const nameX = cx + 86;
    const valueText = eco.money(c.value);
    ctx.font = `bold 24px ${FONT}`;
    const vw = ctx.measureText(valueText).width;
    const nameMax = cw - 86 - vw - 50;

    let nx = nameX;
    if (c.id === o.primaryId) {
      drawStar(ctx, nameX + 11, rcy - 10, 11, "#d97706");
      nx += 30;
    }
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold 27px ${FONT}`;
    ctx.fillText(fit(ctx, c.name, nameMax - (nx - nameX)), nx, rcy - 2);
    ctx.fillStyle = "#64748b";
    ctx.font = `21px ${FONT}`;
    ctx.fillText(fit(ctx, c.series, nameMax), nameX, rcy + 24);

    ctx.fillStyle = "#0369a1";
    ctx.font = `bold 24px ${FONT}`;
    ctx.textAlign = "right";
    ctx.fillText(valueText, cx + cw - 24, rcy + 8);
    ctx.textAlign = "left";
    y += ROW_H;
  }

  ctx.fillStyle = "#475569";
  ctx.font = `22px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`Página ${o.page} de ${o.pages}`, W / 2, y + 34);
  ctx.fillText(`${o.prefix}${o.command} <página>`, W / 2, y + 62);
  ctx.textAlign = "left";

  return canvas.toBuffer("image/png");
}

function buildButtons({ usedPrefix, command, page, pages, targetId }) {
  const base = `${usedPrefix}${command}`;
  const make = (label, target, extra) => ({
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({ display_text: label, id: `${base} ${target} u:${targetId}${extra || ""}` })
  });
  const buttons = [];
  if (page > 1) buttons.push(make("Anterior", page - 1));
  if (page < pages) buttons.push(make("Siguiente", page + 1));
  if (page === 1) buttons.push(make("Otra foto", 1, " nuevo"));
  return buttons;
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
    const userArg = args.find((a) => /^u:[0-9A-Za-z_.-]{3,40}$/.test(a));
    const forcedId = userArg ? userArg.slice(2) : null;
    const fresh = args.includes("nuevo");
    const t = forcedId ? null : gacha.target(msg);
    const targetId = forcedId || (t ? t.id : id);
    const targetJid = t ? t.jid : gacha.mentionJid(targetId);
    const name = gacha.displayName(targetId);

    const owned = gacha.getUserCharacters(targetId);
    if (!owned.length) {
      const text = targetId === id ? "ꕥ No tienes personajes reclamados." : `ꕥ *${name}* no tiene personajes reclamados.`;
      return sock.sendMessage(chatId, { text, mentions: [targetJid] }, { quoted: msg });
    }

    const primaryId = gacha.getPrimaryCharacter(targetId);
    const pageArg = args.find((a) => /^\d+$/.test(a));
    const wantsImage = fresh || !!pageArg || args.some((a) => ["img", "imagen", "image"].includes(a.toLowerCase()));
    if (RICH_ENABLED && !wantsImage) {
      try {
        return await sendRichHarem({ sock, msg, chatId, name, owned, primaryId, targetId, usedPrefix, command });
      } catch (richError) {
        console.error("[harem] fallo el HTML interactivo, se usa imagen:", richError);
      }
    }

    const page = pageArg ? parseInt(pageArg, 10) : 1;

    const sorted = [...owned].sort((a, b) => String(a.series).localeCompare(String(b.series)) || b.value - a.value);
    const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
    if (page < 1 || page > pages) return kit.reply(sock, msg, `❀ Página no válida. Hay un total de *${pages}* páginas.`);

    try {
      let featured = null;
      if (page === 1) featured = owned.find((c) => c.id === primaryId) || owned[0] || null;
      const featuredImg = featured ? await featuredImage(featured, fresh) : null;

      const start = (page - 1) * PER_PAGE;
      const buffer = renderCard({
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

      let caption = `✿ Harem de *${name}*\n⌦ Página *${page}* de *${pages}*`;
      if (page < pages) caption += `\n> Usa *${usedPrefix}${command} ${page + 1}* para ver la siguiente página.`;
      const buttons = buildButtons({ usedPrefix, command, page, pages, targetId });
      try {
        return await sock.sendMessage(
          chatId,
          { image: buffer, caption, footer: "Kori", mentions: [targetJid], buttons },
          { quoted: msg }
        );
      } catch (buttonError) {
        console.error("[harem] fallaron los botones, se envía sin ellos:", buttonError);
      }
      return sock.sendMessage(chatId, { image: buffer, caption, mentions: [targetJid] }, { quoted: msg });
    } catch (error) {
      console.error("[harem] fallo la imagen, se usa texto:", error);
    }

    const textPages = Math.max(1, Math.ceil(owned.length / TEXT_PER_PAGE));
    const textPage = Math.min(page, textPages);
    const text = textHarem({ name, owned, primaryId, page: textPage, totalPages: textPages, usedPrefix, command });
    return sock.sendMessage(chatId, { text, mentions: [targetJid] }, { quoted: msg });
  }
});
                                        
