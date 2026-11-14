"use strict";

const kit = require("../../libs/pluginkit");

const SERVERS = {
  catbox: kit.uploadCatbox,
  fare: kit.uploadFare,
  quax: kit.uploadQuax,
  uguu: kit.uploadUguu
};

async function uploadAuto(buffer, mime) {
  for (const name of ["catbox", "fare", "quax", "uguu"]) {
    try {
      return { link: await SERVERS[name](buffer, mime), server: name };
    } catch {}
  }
  throw new Error("Todos los servidores fallaron");
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "tourl";
  const args = (ctx.args || []).filter(Boolean);

  const media = kit.getMedia(kit.getSource(msg));
  const mime = media?.mimetype || "";

  if (!mime) {
    return kit.reply(
      sock,
      msg,
      `《✧》 Por favor, responde a una imagen o video con *${usedPrefix + command} [servidor]* para convertirlo en URL.\n\n✿ Servidores disponibles:\n> › catbox (permanente)\n> › fare\n> › quax\n> › uguu (temporal, 3h)\n> › auto (selecciona automáticamente)`
    );
  }

  try {
    const buffer = await kit.downloadMedia(media);
    if (!buffer?.length) return kit.reply(sock, msg, "ꕥ No se pudo descargar el archivo.");

    const serverArg = args[0]?.toLowerCase() || "catbox";
    if (serverArg !== "auto" && !SERVERS[serverArg]) {
      return kit.reply(sock, msg, "ꕥ Servidor no válido. Actuales disponibles: catbox, fare, quax, uguu o auto");
    }

    const { link, server } =
      serverArg === "auto"
        ? await uploadAuto(buffer, mime)
        : { link: await SERVERS[serverArg](buffer, mime), server: serverArg };

    const type = (mime.split(";")[0].split("/")[1] || "unknown").toUpperCase();
    const requester = msg.pushName || "Usuario";
    await kit.reply(
      sock,
      msg,
      `𖹭 ❀ *Upload To ${server.toUpperCase()}*\n\nׅ  ׄ  ✿   ׅ り *Link ›* ${link}\nׅ  ׄ  ✿   ׅ り *Peso ›* ${formatBytes(buffer.length)}\nׅ  ׄ  ✿   ׅ り *Tipo ›* ${type}\nׅ  ׄ  ✿   ׅ り *Solicitado por ›* ${requester}`
    );
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["tourl"];
handler.description = "Convertir una imagen en un enlace.";
handler.category = "Utilidades";
module.exports = handler;
