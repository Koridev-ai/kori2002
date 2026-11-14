"use strict";

const axios = require("axios");
const kit = require("../../libs/pluginkit");

const LANGS = {
  typescript: "ts",
  javascript: "js",
  python: "py",
  html: "html",
  css: "css",
  java: "java",
  cpp: "cpp",
  c: "c",
  json: "json",
  bash: "sh",
  sql: "sql",
  rust: "rs",
  go: "go",
  php: "php",
  ruby: "rb"
};

function detectLanguage(query, response) {
  const q = query.toLowerCase();
  const r = response;
  if (/typescript/i.test(q)) return "typescript";
  if (/\bpython\b/i.test(q)) return "python";
  if (/\bhtml\b/i.test(q)) return "html";
  if (/\bcss\b/i.test(q)) return "css";
  if (/\bjava\b(?!script)/i.test(q)) return "java";
  if (/\bc\+\+|cpp\b/i.test(q)) return "cpp";
  if (/\bjson\b/i.test(q)) return "json";
  if (/\bbash\b|\bshell\b/i.test(q)) return "bash";
  if (/\bsql\b/i.test(q)) return "sql";
  if (/\brust\b/i.test(q)) return "rust";
  if (/\bgolang\b|\bgo\b/i.test(q)) return "go";
  if (/\bphp\b/i.test(q)) return "php";
  if (/\bruby\b/i.test(q)) return "ruby";
  if (/javascript/i.test(q)) return "javascript";
  const asksCode = /(c[oó]digo|code|programa|script|funci[oó]n|clase|m[eé]todo|algoritmo|actualiza|edita|crea|implementa)/i.test(q);
  if (!asksCode) return null;
  if (/def |import \w+\n|print\s*\(|:\n\s{4}/i.test(r)) return "python";
  if (/<html|<div|<body|<span|<head/i.test(r)) return "html";
  if (/\{[\s\S]*color:|margin:|padding:|font-/i.test(r)) return "css";
  if (/public\s+class|System\.out\.print/i.test(r)) return "java";
  if (/#include\s*<|int main\s*\(/i.test(r)) return "cpp";
  if (/SELECT |INSERT |UPDATE |DELETE |CREATE TABLE/i.test(r)) return "sql";
  if (/fn main\(\)|let mut |println!\(/i.test(r)) return "rust";
  if (/func \w+\(|package main|fmt\.Print/i.test(r)) return "go";
  if (/<\?php|\$[a-z_]+\s*=/i.test(r)) return "php";
  if (/def initialize|\.each do |puts /i.test(r)) return "ruby";
  return null;
}

async function askSiputzx({ text, user, prompt, imageUrl }) {
  const body = { content: text, user, prompt, model: "gemini" };
  if (imageUrl) body.imageBuffer = imageUrl;
  const res = await axios.post("https://ai.siputzx.my.id", body, { timeout: 60000 });
  return res.data?.result || null;
}

async function askDelirius({ text, prompt }) {
  const url = `https://api.delirius.online/ia/gptprompt?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(prompt)}`;
  const res = await axios.get(url, { timeout: 60000 });
  const json = res.data;
  if (json?.status && json?.data && json.data !== "Error: No response") return json.data;
  return null;
}

async function askPollinations({ text, prompt }) {
  const url = `https://text.pollinations.ai/${encodeURIComponent(text)}?system=${encodeURIComponent(prompt)}`;
  const res = await axios.get(url, { timeout: 60000, responseType: "text" });
  return typeof res.data === "string" && res.data.trim() ? res.data : null;
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const sender = ctx.sender || msg.key.participant || chatId;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "ia";
  const text = (ctx.args || []).join(" ").trim();

  if (!text) {
    return kit.reply(sock, msg, "《✧》 Escriba una *petición* para que *ChatGPT* le responda.");
  }

  const username = msg.pushName || "usuario";
  const botname = sock.user?.name || "Bot";
  const basePrompt = `Tu nombre es ${botname} y parece haber sido creada por Neykoor. Tu versión actual es @latest, Tú usas el idioma Español. Llamarás a las personas por su nombre ${username}, te gusta ser divertida, y te encanta aprender. Lo más importante es que debes ser amigable con la persona con la que estás hablando. ${username}`;

  try {
    const sent = await sock.sendMessage(chatId, { text: "ꕥ *ChatGPT* está procesando tu respuesta..." }, { quoted: msg });
    const key = sent?.key;
    await kit.react(sock, msg, "🕒");

    let imageUrl = null;
    const quoted = kit.getQuoted(msg);
    const media = kit.getMedia(quoted?.message);
    if (media && (media.type === "image" || media.type === "video")) {
      try {
        const buffer = await kit.downloadMedia(media);
        if (buffer?.length) imageUrl = await kit.uploadUguu(buffer, media.mimetype);
      } catch {
        imageUrl = null;
      }
    }

    const params = { text, user: sender, prompt: basePrompt, imageUrl };
    let responseText = null;
    for (const provider of [askSiputzx, askDelirius, askPollinations]) {
      try {
        responseText = await provider(params);
        if (responseText) break;
      } catch {
        responseText = null;
      }
    }

    const edit = (content) => (key ? sock.sendMessage(chatId, { text: content, edit: key }) : kit.reply(sock, msg, content));

    if (!responseText) {
      await edit("《✧》 No se pudo obtener una *respuesta* válida");
      await kit.react(sock, msg, "✖️");
      return;
    }

    const clean = String(responseText).trim();
    const lang = detectLanguage(text, clean);

    if (lang) {
      const ext = LANGS[lang] ?? "txt";
      await edit(`ꕥ *ChatGPT* · respuesta en *${lang}*`);
      await sock.sendMessage(
        chatId,
        {
          document: Buffer.from(clean, "utf-8"),
          mimetype: "text/plain",
          fileName: `ꕥ respuesta.${ext}`,
          caption: `✎ *ChatGPT*\n\n› Lenguaje: ${lang}\n› Líneas: ${clean.split("\n").length}\n› Caracteres: ${clean.length}`
        },
        { quoted: msg }
      );
    } else {
      await edit(clean);
    }
    await kit.react(sock, msg, "✔️");
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e)).catch(() => null);
  }
};

handler.command = ["ia", "chatgpt"];
handler.description = "Realizar peticiones a ChatGPT.";
handler.category = "Utilidades";
module.exports = handler;
