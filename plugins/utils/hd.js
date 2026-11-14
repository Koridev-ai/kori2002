"use strict";

const { promises: fsp } = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const kit = require("../../libs/pluginkit");

const API = "https://us-central1-vector-ink.cloudfunctions.net/upscaleImage";
const ORIGIN = "https://vectorink.io";
const TIMEOUT = 120000;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";
const SUPPORTED = /^image\/(jpe?g|png|webp)$/i;

function sniffImage(buffer) {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

async function safeJson(res) {
  const text = await res.text().catch(() => "");
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function runFfmpeg(args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    const timer = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {}
      reject(new Error("ffmpeg timeout"));
    }, timeoutMs);
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      code === 0 ? resolve(true) : reject(new Error(stderr || `ffmpeg salió con código ${code}`));
    });
  });
}

async function webpToPng(webpBuffer, tmpDir) {
  const detected = sniffImage(webpBuffer);
  if (detected && !SUPPORTED.test(detected)) return { ok: false, error: `formato inesperado de la API: ${detected}` };
  const tag = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const inPath = path.join(tmpDir, `vi_in_${tag}.webp`);
  const outPath = path.join(tmpDir, `vi_out_${tag}.png`);
  await fsp.writeFile(inPath, webpBuffer);
  try {
    await runFfmpeg(["-y", "-i", inPath, "-frames:v", "1", outPath], 60000);
    const png = await fsp.readFile(outPath);
    return { ok: true, png };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  } finally {
    await fsp.unlink(inPath).catch(() => {});
    await fsp.unlink(outPath).catch(() => {});
  }
}

async function enhanceVectorInk(inputBuffer) {
  const out = { ok: false };
  const tmpDir = path.join(os.tmpdir(), "vectorink");
  try {
    await fsp.mkdir(tmpDir, { recursive: true });
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "*/*",
        origin: ORIGIN,
        referer: `${ORIGIN}/`,
        "user-agent": USER_AGENT
      },
      body: JSON.stringify({ data: { image: inputBuffer.toString("base64") } }),
      signal: AbortSignal.timeout(TIMEOUT)
    });
    const json = await safeJson(res);
    if (!res.ok) {
      out.error = { step: "request", status: res.status, body: JSON.stringify(json).slice(0, 200) };
      return out;
    }
    const innerText = json?.result;
    if (typeof innerText !== "string" || innerText.length < 10) {
      out.error = { step: "parse", code: "no_result" };
      return out;
    }
    let inner;
    try {
      inner = JSON.parse(innerText);
    } catch {
      out.error = { step: "parse", code: "bad_result_json" };
      return out;
    }
    const webpB64 = inner?.image?.b64_json;
    if (!webpB64 || typeof webpB64 !== "string") {
      out.error = { step: "parse", code: "no_b64" };
      return out;
    }
    const webpBuffer = Buffer.from(webpB64, "base64");
    if (webpBuffer.length < 10) {
      out.error = { step: "parse", code: "b64_empty" };
      return out;
    }
    const converted = await webpToPng(webpBuffer, tmpDir);
    if (!converted.ok) {
      out.error = { step: "convert", code: "ffmpeg_failed", message: converted.error };
      return out;
    }
    out.ok = true;
    out.buffer = converted.png;
    return out;
  } catch (e) {
    out.error = { step: "exception", message: e?.message || String(e) };
    return out;
  }
}

async function enhanceVyro(inputBuffer, operation = "enhance") {
  const out = { ok: false };
  try {
    const form = new FormData();
    form.append("model_version", "1");
    form.append("image", new Blob([inputBuffer], { type: "image/jpeg" }), "enhance_image_body.jpg");
    const res = await fetch(`https://inferenceengine.vyro.ai/${operation}`, {
      method: "POST",
      headers: { "user-agent": "okhttp/4.9.3", connection: "Keep-Alive" },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (!res.ok) {
      out.error = { step: "request", status: res.status };
      return out;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!sniffImage(buffer)) {
      out.error = { step: "parse", code: "not_image" };
      return out;
    }
    out.ok = true;
    out.buffer = buffer;
    return out;
  } catch (e) {
    out.error = { step: "exception", message: e?.message || String(e), cause: e?.cause?.code || e?.cause?.message };
    return out;
  }
}

async function enhanceLocal(inputBuffer) {
  const out = { ok: false };
  const tmpDir = path.join(os.tmpdir(), "vectorink");
  const tag = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const inPath = path.join(tmpDir, `loc_in_${tag}`);
  const outPath = path.join(tmpDir, `loc_out_${tag}.jpg`);
  try {
    await fsp.mkdir(tmpDir, { recursive: true });
    await fsp.writeFile(inPath, inputBuffer);
    await runFfmpeg([
      "-y", "-i", inPath,
      "-vf", "scale=w='min(2*iw,2560)':h=-2:flags=lanczos,unsharp=5:5:0.9:5:5:0.0,eq=contrast=1.05:saturation=1.08",
      "-frames:v", "1", "-q:v", "2", outPath
    ], 60000);
    out.buffer = await fsp.readFile(outPath);
    out.ok = true;
    return out;
  } catch (e) {
    out.error = { step: "local", message: e?.message || String(e) };
    return out;
  } finally {
    await fsp.unlink(inPath).catch(() => {});
    await fsp.unlink(outPath).catch(() => {});
  }
}

async function enhance(inputBuffer) {
  const providers = [enhanceVectorInk, enhanceVyro, enhanceLocal];
  let last = { ok: false, error: { step: "none" } };
  for (const provider of providers) {
    const result = await provider(inputBuffer);
    if (result.ok) return result;
    console.error(`[hd] ${provider.name} falló:`, JSON.stringify(result.error));
    last = result;
  }
  return last;
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "hd";

  try {
    const media = kit.getMedia(kit.getSource(msg));
    const mime = media?.mimetype || "";
    if (!mime) {
      return kit.reply(sock, msg, `《✧》 Responde a una *imagen* con:\n${usedPrefix + command}`);
    }
    if (!SUPPORTED.test(mime)) {
      return kit.reply(sock, msg, `《✧》 El formato *${mime}* no es compatible`);
    }

    const buffer = await kit.downloadMedia(media);
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 10) {
      return kit.reply(sock, msg, "《✧》 No se pudo descargar la imagen");
    }

    const resolvedMime = sniffImage(buffer) || mime;
    if (!SUPPORTED.test(resolvedMime)) {
      return kit.reply(sock, msg, `《✧》 El formato *${resolvedMime}* no es compatible`);
    }

    const result = await enhance(buffer);
    if (!result.ok || !result.buffer) {
      const reason = [result.error?.step, result.error?.status, result.error?.code].filter(Boolean).join(" ") || result.error?.message || "error desconocido";
      return kit.reply(sock, msg, `《✧》 No se pudo *mejorar* la imagen (${reason})`);
    }

    await sock.sendMessage(chatId, { image: result.buffer }, { quoted: msg });
  } catch (e) {
    console.error(e);
    await kit.reply(sock, msg, `> Ocurrió un error inesperado ejecutando *${usedPrefix + command}*.\n> [Error: *${e?.message || String(e)}*]`);
  }
};

handler.command = ["hd", "enhance", "remini"];
handler.description = "Mejorar la calidad de una imagen.";
handler.category = "Utilidades";
module.exports = handler;
