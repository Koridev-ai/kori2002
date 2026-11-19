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

const BAD_RESPONSE = /text\.pollinations\.ai|enter\.pollinations\.ai|IMPORTANT NOTICE|deprecated|no longer (supported|available)|api key|unauthorized|rate limit|too many requests/i;

function validText(value) {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  if (clean.length < 2) return null;
  if (BAD_RESPONSE.test(clean.slice(0, 400)) && clean.length < 600) return null;
  if (/^\{[\s\S]*"error"/i.test(clean)) return null;
  if (clean.length < 220 && /^(lo siento|lo lamento|disculpa|perd[oó]n|lamentablemente)[\s\S]{0,60}(no puedo|no me es posible|no estoy en posici[oó]n)/i.test(clean)) return null;
  if (clean.length < 220 && /^(i'?m sorry|sorry|i can(no|')t)/i.test(clean)) return null;
  return clean;
}

async function askGroq({ text, prompt, imageBuffer }) {
  const key = process.env.GROQ_API_KEY;
  if (!key || imageBuffer) return null;
  const models = process.env.GROQ_MODEL ? [process.env.GROQ_MODEL] : ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  let lastError = null;
  for (const model of models) {
    try {
      const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model,
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: text }
          ],
          temperature: 0.7,
          max_tokens: 1500
        },
        { timeout: 30000, headers: { Authorization: `Bearer ${key}` } }
      );
      const out = validText(res.data?.choices?.[0]?.message?.content);
      if (out) return out;
    } catch (e) {
      lastError = e;
    }
  }
  if (lastError) throw lastError;
  return null;
}

async function askGemini({ text, prompt, imageBuffer, imageMime }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const parts = [{ text }];
  if (imageBuffer) parts.push({ inlineData: { mimeType: imageMime || "image/jpeg", data: imageBuffer.toString("base64") } });
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      systemInstruction: { parts: [{ text: prompt }] },
      contents: [{ role: "user", parts }],
      safetySettings: ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH", "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"].map((category) => ({ category, threshold: "BLOCK_ONLY_HIGH" }))
    },
    { timeout: 40000, headers: { "x-goog-api-key": key } }
  );
  const out = res.data?.candidates?.[0]?.content?.parts;
  return validText(Array.isArray(out) ? out.map((p) => p.text || "").join("") : "");
}

async function askOpenRouter({ text, prompt, imageBuffer }) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || imageBuffer) return null;
  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text }
      ]
    },
    { timeout: 40000, headers: { Authorization: `Bearer ${key}` } }
  );
  return validText(res.data?.choices?.[0]?.message?.content);
}

async function askPollinations({ text, prompt, imageBuffer }) {
  if (imageBuffer) return null;
  const params = new URLSearchParams({ system: prompt, model: process.env.POLLINATIONS_MODEL || "openai" });
  if (process.env.POLLINATIONS_API_KEY) params.set("key", process.env.POLLINATIONS_API_KEY);
  const res = await axios.get(`https://gen.pollinations.ai/text/${encodeURIComponent(text)}?${params.toString()}`, {
    timeout: 30000,
    responseType: "text",
    transformResponse: (data) => data
  });
  return validText(res.data);
}

async function askSiputzx({ text, user, prompt, imageUrl }) {
  const body = { content: text, user, prompt, model: "gemini" };
  if (imageUrl) body.imageBuffer = imageUrl;
  const res = await axios.post("https://ai.siputzx.my.id", body, { timeout: 30000 });
  return validText(res.data?.result);
}

async function askDelirius({ text, prompt }) {
  const url = `https://api.delirius.online/ia/gptprompt?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(prompt)}`;
  const res = await axios.get(url, { timeout: 30000 });
  const json = res.data;
  if (json?.status && json?.data && json.data !== "Error: No response") return validText(json.data);
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(fn) {
  try {
    return await fn();
  } catch (e) {
    const status = e?.response?.status;
    if (status === 429 || status >= 500) {
      await sleep(1500);
      return await fn();
    }
    throw e;
  }
}

const PROVIDERS = [askGroq, askGemini, askOpenRouter, askPollinations, askSiputzx, askDelirius];

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
  const botname = "Rem";
  const basePrompt = `Tu nombre es ${botname} y parece haber sido creada por Neykoor. Tu versión actual es @latest, Tú usas el idioma Español. Llamarás a las personas por su nombre ${username}, te gusta ser divertida, y te encanta aprender. Lo más importante es que debes ser amigable con la persona con la que estás hablando y responder siempre con información correcta y directa. Estás en un chat de WhatsApp entre amigos, así que tu tono es casual y de broma. Si te proponen un juego, un "qué prefieres", una elección o una pregunta hipotética como "serías la pareja de...", participa siempre: elige una opción con decisión y justifícala en una o dos frases con humor, sin negarte y sin decir que no puedes participar. Mantén las respuestas cortas y sin contenido sexual explícito. ${username}`;

  try {
    const sent = await sock.sendMessage(chatId, { text: "ꕥ *ChatGPT* está procesando tu respuesta..." }, { quoted: msg });
    const key = sent?.key;
    await kit.react(sock, msg, "🕒");

    let imageUrl = null;
    let imageBuffer = null;
    let imageMime = null;
    const quoted = kit.getQuoted(msg);
    const media = kit.getMedia(quoted?.message);
    if (media && media.type === "image") {
      try {
        const buffer = await kit.downloadMedia(media);
        if (buffer?.length) {
          imageBuffer = buffer;
          imageMime = media.mimetype;
          imageUrl = await kit.uploadUguu(buffer, media.mimetype);
        }
      } catch {
        imageUrl = imageUrl || null;
      }
    } else if (media && media.type === "video") {
      try {
        const buffer = await kit.downloadMedia(media);
        if (buffer?.length) imageUrl = await kit.uploadUguu(buffer, media.mimetype);
      } catch {
        imageUrl = null;
      }
    }

    const params = { text, user: sender, prompt: basePrompt, imageUrl, imageBuffer, imageMime };
    let responseText = null;
    const failures = [];
    for (const provider of PROVIDERS) {
      try {
        responseText = await withRetry(() => provider(params));
        if (responseText) break;
        failures.push(`${provider.name}: sin respuesta`);
      } catch (e) {
        const reason = `${e?.response?.status || ""} ${e?.message || e}`.trim();
        console.log(`[ia] ${provider.name} falló: ${reason}`);
        failures.push(`${provider.name}: ${reason}`);
        responseText = null;
      }
    }

    const edit = (content) => (key ? sock.sendMessage(chatId, { text: content, edit: key }) : kit.reply(sock, msg, content));

    if (!responseText) {
      const detail = global.isOwner?.(sender) ? `\n\n${failures.map((f) => `> ${f}`).join("\n")}` : "";
      await edit(`《✧》 No se pudo obtener una *respuesta* válida${detail}`);
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
      
