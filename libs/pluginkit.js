"use strict";

const axios = require("axios");
const FormData = require("form-data");

const WRAPPERS = [
  "ephemeralMessage",
  "viewOnceMessage",
  "viewOnceMessageV2",
  "viewOnceMessageV2Extension",
  "documentWithCaptionMessage",
  "editedMessage"
];

const MEDIA_TYPES = {
  imageMessage: "image",
  videoMessage: "video",
  audioMessage: "audio",
  stickerMessage: "sticker",
  documentMessage: "document"
};

function unwrap(message) {
  let current = message;
  for (let i = 0; i < 6 && current; i++) {
    const key = WRAPPERS.find((name) => current[name]?.message);
    if (!key) break;
    current = current[key].message;
  }
  return current || null;
}

function getContextInfo(message) {
  const content = unwrap(message);
  if (!content) return null;
  for (const value of Object.values(content)) {
    if (value && typeof value === "object" && value.contextInfo) return value.contextInfo;
  }
  return null;
}

function getQuoted(msg) {
  const info = getContextInfo(msg.message);
  if (!info?.quotedMessage) return null;
  const message = unwrap(info.quotedMessage);
  if (!message) return null;
  return { message, sender: info.participant || null, id: info.stanzaId || null };
}

function getMentions(msg) {
  return getContextInfo(msg.message)?.mentionedJid || [];
}

function getMedia(message) {
  if (!message) return null;
  for (const [name, type] of Object.entries(MEDIA_TYPES)) {
    if (message[name]) return { name, type, node: message[name], mimetype: message[name].mimetype || "" };
  }
  return null;
}

function buttonReplyId(message) {
  const flow = message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
  if (flow) {
    try {
      const parsed = JSON.parse(flow);
      if (parsed && parsed.id) return String(parsed.id);
    } catch {}
  }
  return (
    message.buttonsResponseMessage?.selectedButtonId ||
    message.templateButtonReplyMessage?.selectedId ||
    message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ""
  );
}

function getText(message) {
  if (!message) return "";
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    buttonReplyId(message) ||
    ""
  );
}

async function downloadMedia(media) {
  const stream = await global.downloadContentFromMessage(media.node, media.type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function getSource(msg) {
  const quoted = getQuoted(msg);
  return quoted ? quoted.message : unwrap(msg.message);
}

function react(sock, msg, emoji) {
  return sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }).catch(() => null);
}

function reply(sock, msg, text, extra = {}) {
  return sock.sendMessage(msg.key.remoteJid, { text, ...extra }, { quoted: msg });
}

function errorText(usedPrefix, command, error) {
  return `> An unexpected error occurred while executing command *${usedPrefix + command}*. Please try again or contact support if the issue persists.\n> [Error: *${error?.message || String(error)}*]`;
}

function uniqueName(mime) {
  const ext = String(mime || "image/jpeg").split("/")[1]?.split(";")[0] || "jpg";
  return `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
}

const UPLOAD_LIMITS = { maxContentLength: Infinity, maxBodyLength: Infinity, timeout: 120000 };

async function uploadCatbox(buffer, mime) {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", buffer, uniqueName(mime));
  const res = await axios.post("https://catbox.moe/user/api.php", form, { headers: form.getHeaders(), ...UPLOAD_LIMITS });
  const url = typeof res.data === "string" ? res.data.trim() : "";
  if (!/^https:\/\//.test(url)) throw new Error("Respuesta inválida de Catbox: " + JSON.stringify(res.data));
  return url;
}

async function uploadFare(buffer, mime) {
  const form = new FormData();
  form.append("file", buffer, uniqueName(mime));
  const res = await axios.post("https://u.fare.ink/api/upload", form, { headers: form.getHeaders(), ...UPLOAD_LIMITS });
  const url = res.data?.file?.publicUrl;
  if (!url || typeof url !== "string" || !url.startsWith("https://")) {
    throw new Error("Respuesta inválida de Fare: " + JSON.stringify(res.data));
  }
  return url;
}

async function uploadQuax(buffer, mime) {
  const form = new FormData();
  form.append("files[]", buffer, uniqueName(mime));
  const res = await axios.post("https://qu.ax/upload.php", form, { headers: form.getHeaders(), ...UPLOAD_LIMITS });
  const url = res.data?.files?.[0]?.url;
  if (!url) throw new Error("Respuesta inválida de Qu.ax: " + JSON.stringify(res.data));
  return url;
}

async function uploadUguu(buffer, mime) {
  const form = new FormData();
  form.append("files[]", buffer, uniqueName(mime));
  const res = await axios.post("https://uguu.se/upload.php", form, { headers: form.getHeaders(), ...UPLOAD_LIMITS });
  const url = res.data?.files?.[0]?.url;
  if (!url) throw new Error("Respuesta inválida de Uguu: " + JSON.stringify(res.data));
  return url;
}

module.exports = {
  unwrap,
  getContextInfo,
  getQuoted,
  getMentions,
  getMedia,
  getText,
  getSource,
  downloadMedia,
  react,
  reply,
  errorText,
  uniqueName,
  uploadCatbox,
  uploadFare,
  uploadQuax,
  uploadUguu
};
