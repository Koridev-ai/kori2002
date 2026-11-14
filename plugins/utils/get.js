"use strict";

const fetch = require("node-fetch");
const { format } = require("util");
const kit = require("../../libs/pluginkit");

const EXTENSIONS = {
  "text/html": ".html",
  "text/css": ".css",
  "text/javascript": ".js",
  "application/javascript": ".js",
  "application/json": ".json",
  "text/xml": ".xml",
  "text/plain": ".txt"
};

function getExtension(contentType, url) {
  const match = url.match(/\.(\w+)(?:\?|$)/);
  if (match) return `.${match[1]}`;
  const base = contentType.split(";")[0].trim();
  return EXTENSIONS[base] || ".txt";
}

function fileNameFromUrl(url) {
  try {
    const name = new URL(url).pathname.split("/").filter(Boolean).pop();
    return name || "file";
  } catch {
    return "file";
  }
}

async function sendBinary(sock, chatId, msg, buffer, contentType, url, caption) {
  const mimetype = contentType.split(";")[0].trim() || "application/octet-stream";
  const fileName = fileNameFromUrl(url);
  if (/^image\//.test(mimetype)) return sock.sendMessage(chatId, { image: buffer, caption }, { quoted: msg });
  if (/^video\//.test(mimetype)) return sock.sendMessage(chatId, { video: buffer, caption, mimetype }, { quoted: msg });
  if (/^audio\//.test(mimetype)) return sock.sendMessage(chatId, { audio: buffer, mimetype }, { quoted: msg });
  return sock.sendMessage(chatId, { document: buffer, mimetype, fileName, caption }, { quoted: msg });
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "get";
  const target = (ctx.args || []).filter(Boolean)[0];

  if (!target) return kit.reply(sock, msg, "《✧》 Ingresa un enlace para realizar la solicitud.");
  if (!/^https?:\/\//.test(target)) {
    return kit.reply(sock, msg, "《✧》 Ingresa un enlace válido que comience con http o https");
  }

  try {
    const parsed = new URL(target);
    const params = new URLSearchParams(parsed.searchParams);
    const url = `${parsed.origin}${parsed.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    const res = await fetch(url, { timeout: 60000 });
    const contentType = res.headers.get("content-type") || "";
    const contentLength = parseInt(res.headers.get("content-length") || "0");

    if (contentLength > 100 * 1024 * 1024) {
      return kit.reply(sock, msg, `《✧》 El archivo es demasiado grande.\nContent-Length: ${contentLength} bytes`);
    }

    const buffer = await res.buffer();

    if (/text|json/.test(contentType)) {
      const content = buffer.toString();
      if (content.length > 500 && /html|css|javascript|json|xml|plain/.test(contentType)) {
        const ext = getExtension(contentType, url);
        return sock.sendMessage(
          chatId,
          {
            document: Buffer.from(content, "utf-8"),
            mimetype: contentType.split(";")[0].trim() || "text/plain",
            fileName: `code_${Date.now()}${ext}`
          },
          { quoted: msg }
        );
      }
      try {
        const json = JSON.parse(content);
        return kit.reply(sock, msg, format(json).slice(0, 65536));
      } catch {
        return kit.reply(sock, msg, content.slice(0, 65536));
      }
    }

    return sendBinary(sock, chatId, msg, buffer, contentType, url, target);
  } catch (e) {
    console.error(e);
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["get", "fetch"];
handler.description = "Realizar solicitudes GET a páginas web.";
handler.category = "Utilidades";
module.exports = handler;
