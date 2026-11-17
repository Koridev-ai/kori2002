"use strict";

const axios = require("axios");
const kit = require("../../libs/pluginkit");
const dl = require("../../libs/dlkit");

async function download(url) {
  const res = await dl.getJson(`${dl.api("fare").url}/dl/pin`, { params: { url } });
  const data = res?.status && res.resultado;
  if (!data?.url) return null;
  const isVideo = /\.mp4(?:$|\?)/i.test(data.filename || "") || /\.mp4(?:$|\?)/i.test(data.url);
  return { type: isVideo ? "video" : "image", url: data.url, title: data.titulo || null, author: data.autor || null, filename: data.filename || (isVideo ? "pin.mp4" : "pin.jpg") };
}

const usedByChat = new Map();
const MAX_HISTORY = 500;
const MAX_PIN_ATTEMPTS = 5;
const PINIMG_SIZE_RE = /(https?:\/\/[a-z0-9.-]*\.?pinimg\.com\/)(\d+x\d*|originals)(\/)/i;
const IMAGE_EXT_RE = /\.(?:jpe?g|png|webp|gif)(?=$|[?#])/i;
const IMAGE_FALLBACK_SIZES = ["originals", "1200x", "736x", "564x", "474x", "345x", "236x"];

function getUsed(chatId) {
  let set = usedByChat.get(chatId);
  if (!set) {
    set = new Set();
    usedByChat.set(chatId, set);
  }
  return set;
}

function markUsed(used, url) {
  used.add(url);
  if (used.size > MAX_HISTORY) used.delete(used.values().next().value);
}

function cleanText(value) {
  if (typeof value !== "string") return "";
  const text = value.replace(/\s+/g, " ").trim();
  return /^[-✿]*$/.test(text) ? "" : text.slice(0, 300);
}

function pickImageUrl(pin) {
  return (
    pin?.image ||
    pin?.imageUrl ||
    pin?.image_url ||
    pin?.images?.orig?.url ||
    pin?.images?.["736x"]?.url ||
    pin?.images?.["345x"]?.url ||
    pin?.images?.["236x"]?.url ||
    pin?.media?.images?.orig?.url ||
    pin?.thumbnail
  );
}

function pickAuthorName(pin) {
  const name =
    (typeof pin?.author === "string" ? pin.author : null) ||
    pin?.native_creator?.full_name ||
    pin?.pinner?.full_name ||
    pin?.pinner?.username ||
    pin?.author?.name ||
    pin?.author?.full_name ||
    pin?.author?.username ||
    pin?.board?.owner?.full_name ||
    pin?.board?.owner?.username ||
    pin?.board_owner?.full_name ||
    pin?.originator?.full_name ||
    pin?.creator?.full_name ||
    pin?.name ||
    pin?.username;
  return typeof name === "string" && name.trim() ? name.trim() : "Desconocido";
}

function toPinterestSize(url, size) {
  if (!PINIMG_SIZE_RE.test(url)) return url;
  return url.replace(PINIMG_SIZE_RE, (_match, prefix, _size, slash) => `${prefix}${size}${slash}`);
}

function withJpgExtension(url) {
  return url.replace(IMAGE_EXT_RE, ".jpg");
}

function pickRandomPins(pins, count) {
  const pool = [...pins];
  const picked = [];
  while (pool.length && picked.length < count) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return picked;
}

function collectImageCandidates(pin, primaryUrl) {
  const seen = new Set();
  const candidates = [];
  const add = (url) => {
    if (url && !seen.has(url)) {
      seen.add(url);
      candidates.push(url);
    }
  };
  if (PINIMG_SIZE_RE.test(primaryUrl)) {
    add(toPinterestSize(primaryUrl, "originals"));
    add(primaryUrl);
    for (const size of IMAGE_FALLBACK_SIZES) if (size !== "originals") add(withJpgExtension(toPinterestSize(primaryUrl, size)));
  } else {
    add(primaryUrl);
  }
  add(pin?.images?.orig?.url);
  add(pin?.images?.["736x"]?.url);
  add(pin?.images?.["345x"]?.url);
  add(pin?.images?.["236x"]?.url);
  add(pin?.media?.images?.orig?.url);
  add(pin?.thumbnail);
  return candidates;
}

function sniffImage(buffer) {
  const head = buffer.subarray(0, 12);
  if (head[0] === 0xff && head[1] === 0xd8) return "image/jpeg";
  if (head.toString("latin1", 1, 4) === "PNG") return "image/png";
  if (head.toString("latin1", 0, 4) === "GIF8") return "image/gif";
  if (head.toString("latin1", 0, 4) === "RIFF" && head.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return null;
}

async function fetchPinterestImage(pin, primaryUrl) {
  let lastError = new Error("No se pudo descargar la imagen en ninguna calidad disponible");
  for (const candidate of collectImageCandidates(pin, primaryUrl)) {
    try {
      const buffer = await dl.getBuffer(candidate, { timeout: 30000, max: 30 * 1024 * 1024 });
      const mime = sniffImage(buffer);
      if (!mime) {
        lastError = new Error(`Respuesta inválida (no es imagen) en ${candidate}`);
        continue;
      }
      return { buffer, mime };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

async function searchDelirius(query) {
  let data;
  try {
    data = await dl.getJson(`${dl.api("delirius").url}/search/pinterestv2`, { params: { text: query }, timeout: 15000 });
  } catch (e) {
    const body = e?.response?.data;
    if (body && typeof body === "object" && body.status === false && /not found|no results|sin resultados/i.test(String(body.msg ?? ""))) return [];
    throw e;
  }
  if (!data?.status || !Array.isArray(data?.data)) return [];
  return data.data.filter((pin) => typeof pin?.image === "string" && pin.image);
}

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const SESSION_TTL_MS = 30 * 60 * 1000;
let session = null;
let sessionAt = 0;

async function getSession(force = false) {
  if (!force && session && Date.now() - sessionAt < SESSION_TTL_MS) return session;
  const res = await axios.get("https://www.pinterest.com/", {
    headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" },
    timeout: 15000,
    responseType: "text",
    transformResponse: (data) => data,
    validateStatus: () => true
  });
  const cookies = (res.headers["set-cookie"] || []).map((c) => c.split(";")[0]);
  const csrf = ((cookies.find((c) => c.startsWith("csrftoken=")) || "").split("=")[1]) || "";
  const version = (String(res.data || "").match(/"appVersion"\s*:\s*"([^"]+)"/) || [])[1] || "";
  session = { cookie: cookies.join("; "), csrf, version };
  sessionAt = Date.now();
  return session;
}

async function requestPinterest(query, s) {
  const source = `/search/pins/?q=${encodeURIComponent(query)}`;
  const headers = {
    "User-Agent": BROWSER_UA,
    Accept: "application/json, text/javascript, */*, q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    "X-Requested-With": "XMLHttpRequest",
    "X-Pinterest-PWS-Handler": "www/index.js",
    Referer: `https://www.pinterest.com${source}`
  };
  if (s.version) headers["X-APP-VERSION"] = s.version;
  if (s.csrf) headers["X-CSRFToken"] = s.csrf;
  if (s.cookie) headers.Cookie = s.cookie;
  const res = await axios.get("https://www.pinterest.com/resource/BaseSearchResource/get/", {
    params: { source_url: source, data: JSON.stringify({ options: { query, scope: "pins", page_size: 50, gated: false }, context: {} }) },
    headers,
    timeout: 15000
  });
  return res.data;
}

async function searchPinterestDirect(query) {
  let data;
  try {
    data = await requestPinterest(query, await getSession());
  } catch (e) {
    if (![401, 403].includes(e?.response?.status)) throw e;
    data = await requestPinterest(query, await getSession(true));
  }
  const results = data?.resource_response?.data?.results;
  if (!Array.isArray(results)) return [];
  return results
    .filter((pin) => pin?.type === "pin" && (pin.images?.orig?.url || pin.images?.["736x"]?.url))
    .map((pin) => ({
      ...pin,
      image: pin.images?.orig?.url || pin.images?.["736x"]?.url,
      title: pin.title || pin.grid_title || "",
      description: pin.description || pin.auto_alt_text || "",
      author: pin.pinner?.full_name || pin.pinner?.username || pin.native_creator?.full_name || ""
    }));
}

function decodeEntities(text) {
  return String(text).replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

async function searchBing(query) {
  const url = `https://www.bing.com/images/async?q=${encodeURIComponent(`site:pinterest.com ${query}`)}&first=0&count=50&mmasync=1`;
  const { status, body } = await dl.getText(url, { headers: { "Accept-Language": "en-US,en;q=0.9" }, timeout: 20000 });
  if (status !== 200) throw new Error(`Bing respondió HTTP ${status}`);
  const pins = [];
  for (const match of body.matchAll(/\sm="(\{.*?\})"/g)) {
    try {
      const item = JSON.parse(decodeEntities(match[1]));
      if (typeof item.murl === "string" && /^https?:\/\//i.test(item.murl)) {
        pins.push({ image: item.murl, thumbnail: item.turl, title: item.t || "", description: item.desc || item.t || "", author: "" });
      }
    } catch {}
  }
  return pins;
}

async function searchFare(query) {
  const res = await dl.getJson(`${dl.api("fare").url}/search/pin`, { params: { q: query, limit: 20 } });
  if (!res?.status || !Array.isArray(res.results)) return [];
  return res.results
    .filter((d) => d?.descarga && !/\.mp4(?:$|\?)/i.test(d.descarga) && String(d.tipo || "").toLowerCase() !== "video")
    .map((d) => ({ image: d.descarga, title: d.titulo || "", description: d.titulo || "", author: d.autor || "" }));
}

async function searchPins(query) {
  const sources = [
    ["pinterest", searchPinterestDirect],
    ["bing", searchBing],
    ["delirius", searchDelirius],
    ["fare", searchFare]
  ];
  const errors = [];
  for (const [name, run] of sources) {
    try {
      const pins = await run(query);
      if (pins.length) return pins;
    } catch (e) {
      errors.push(`${name}: ${e?.response?.status || e?.message || e}`);
    }
  }
  if (errors.length === sources.length) throw new Error(`Ninguna fuente respondió (${errors.join(" | ")})`);
  return [];
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
    const results = await searchPins(text);
    if (!results.length) return kit.reply(sock, msg, `《✧》 No se encontraron resultados para *${text}*.`);
    const used = getUsed(chatId);
    const available = results.filter((pin) => {
      const url = pickImageUrl(pin);
      return url && !used.has(url);
    });
    if (!available.length) return kit.reply(sock, msg, `《✧》 Ya te envié todas las imágenes disponibles para *${text}*. Intenta con otra búsqueda.`);
    let media = null;
    let chosenPin = null;
    let lastError = null;
    for (const pin of pickRandomPins(available, MAX_PIN_ATTEMPTS)) {
      const imageUrl = pickImageUrl(pin);
      if (!imageUrl) continue;
      markUsed(used, imageUrl);
      try {
        media = await fetchPinterestImage(pin, imageUrl);
        chosenPin = pin;
        break;
      } catch (e) {
        lastError = e;
      }
    }
    if (!media || !chosenPin) throw lastError || new Error("Las imágenes encontradas ya no están disponibles, intenta de nuevo en unos segundos.");
    const caption = dl.cap("Pinterest Search", [
      ["Descripción", cleanText(chosenPin.description) || cleanText(chosenPin.title) || "Sin descripción"],
      ["Autor", pickAuthorName(chosenPin)],
      ["Búsqueda", text]
    ]);
    await sock.sendMessage(chatId, { image: media.buffer, mimetype: media.mime, caption }, { quoted: msg });
    return kit.react(sock, msg, "✔");
  }
});
