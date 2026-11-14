"use strict";

const fs = require("fs");
const fetch = require("node-fetch");
const kit = require("../../libs/pluginkit");
const sk = require("../../libs/stickerkit");

const LIST_TEXT = (prefix, command) =>
  `ꕥ Lista de Formas y Efectos Disponibles para *imagen*:\n\n✦ *Formas:*\n- -c : Crea un sticker circular\n- -t : Crea un sticker triangular\n- -s : Crea un sticker con forma de estrella\n- -r : Crea un sticker con esquinas redondeadas\n- -h : Crea un sticker hexagonal\n- -d : Crea un sticker con forma de diamante\n- -f : Crea un sticker con un marco\n- -b : Crea un sticker con un borde\n- -w : Crea un sticker con forma de onda\n- -m : Crea un sticker espejado\n- -o : Crea un sticker octogonal\n- -y : Crea un sticker pentagonal\n- -e : Crea un sticker elíptico\n- -z : Crea un sticker en forma de cruz\n- -v : Crea un sticker con forma de corazón\n- -x : Crea un sticker expandido (cover)\n- -i : Crea un sticker expandido (contain)\n\n✧ *Efectos:*\n- -blur : Aplica un efecto de desenfoque\n- -sepia : Aplica un efecto sepia\n- -sharpen : Aplica un efecto de nitidez\n- -brighten : Aumenta el brillo\n- -darken : Disminuye el brillo\n- -invert : Invierte los colores\n- -grayscale : Aplica escala de grises\n- -rotate90 : Rota la imagen 90 grados\n- -rotate180 : Rota la imagen 180 grados\n- -flip : Invierte la imagen horizontalmente\n- -flop : Invierte la imagen verticalmente\n- -normalice : Normaliza la imagen\n- -negate : Negatiza la imagen\n- -tint : Aplica un tinte de color a la imagen (rojo por defecto)\n\n> Ejemplo: *${prefix + command} -c -blur Pack | Autor*`;

const SHAPE_ARGS = {
  "-c": "circle",
  "-t": "triangle",
  "-s": "star",
  "-r": "roundrect",
  "-h": "hexagon",
  "-d": "diamond",
  "-f": "frame",
  "-b": "border",
  "-w": "wave",
  "-m": "mirror",
  "-o": "octagon",
  "-y": "pentagon",
  "-e": "ellipse",
  "-z": "cross",
  "-v": "heart",
  "-x": "cover",
  "-i": "contain"
};

const EFFECT_ARGS = {
  "-blur": "blur",
  "-sepia": "sepia",
  "-sharpen": "sharpen",
  "-brighten": "brighten",
  "-darken": "darken",
  "-invert": "invert",
  "-grayscale": "grayscale",
  "-rotate90": "rotate90",
  "-rotate180": "rotate180",
  "-flip": "flip",
  "-flop": "flop",
  "-normalice": "normalise",
  "-negate": "negate",
  "-tint": "tint"
};

const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/i;

function buildFilters(effects) {
  const W = 512;
  const H = 512;
  const filters = [];
  const shape = effects.find((e) => e.type === "shape")?.value;
  const effectList = effects.filter((e) => e.type === "effect").map((e) => e.value);

  if (shape === "cover") {
    filters.push(`scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`);
  } else {
    filters.push(`scale=${W}:${H}:force_original_aspect_ratio=decrease`);
    filters.push(`pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`);
  }
  filters.push("format=rgba");

  for (const effect of effectList) {
    switch (effect) {
      case "blur": filters.push("gblur=sigma=5"); break;
      case "sepia": filters.push("colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131"); break;
      case "sharpen": filters.push("unsharp=5:5:1.0:5:5:0.0"); break;
      case "brighten": filters.push("eq=brightness=0.05"); break;
      case "darken": filters.push("eq=brightness=-0.05"); break;
      case "invert":
      case "negate": filters.push("negate"); break;
      case "grayscale": filters.push("hue=s=0"); break;
      case "rotate90": filters.push("transpose=1"); break;
      case "rotate180": filters.push("rotate=PI"); break;
      case "flip": filters.push("hflip"); break;
      case "flop": filters.push("vflip"); break;
      case "normalise": filters.push("normalize"); break;
      case "tint": filters.push("colorchannelmixer=1:0:0:0:0:0.5:0:0:0:0:0.5"); break;
    }
  }

  if (shape === "mirror") filters.push("hflip");

  if (shape && !["cover", "contain", "mirror", "border", "frame"].includes(shape)) {
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) / 2;
    let alphaExpr = "";
    switch (shape) {
      case "circle": alphaExpr = `if(lte((X-${cx})*(X-${cx})+(Y-${cy})*(Y-${cy}),${r * r}),255,0)`; break;
      case "triangle": alphaExpr = `if(gte(Y,${H * 0.1})*lte(Y,${H * 0.9})*lte(abs(X-${cx}),((${H * 0.9}-Y)*0.6)),255,0)`; break;
      case "star": alphaExpr = `if(lte(hypot(X-${cx},Y-${cy}),${W * 0.25}+${W * 0.1}*cos(5*atan2(Y-${cy},X-${cx}))),255,0)`; break;
      case "roundrect": {
        const rad = 50;
        alphaExpr = `if(lte(if(gte(X,${rad})*lte(X,${W - rad})*gte(Y,0)*lte(Y,${H}),0,if(gte(Y,${rad})*lte(Y,${H - rad})*gte(X,0)*lte(X,${W}),0,if(lte(X,${rad})*lte(Y,${rad}),(X-${rad})*(X-${rad})+(Y-${rad})*(Y-${rad}),if(gte(X,${W - rad})*lte(Y,${rad}),(X-${W - rad})*(X-${W - rad})+(Y-${rad})*(Y-${rad}),if(lte(X,${rad})*gte(Y,${H - rad}),(X-${rad})*(X-${rad})+(Y-${H - rad})*(Y-${H - rad}),(X-${W - rad})*(X-${W - rad})+(Y-${H - rad})*(Y-${H - rad})))))),${rad * rad}),255,0)`;
        break;
      }
      case "hexagon": alphaExpr = `if(lte(hypot(X-${cx},Y-${cy}),${W * 0.4}*cos(PI/6)/cos(mod(atan2(Y-${cy},X-${cx}),PI/3)-PI/6)),255,0)`; break;
      case "diamond": alphaExpr = `if(lte(abs(X-${cx})+abs(Y-${cy}),${r}),255,0)`; break;
      case "wave": alphaExpr = `if(lte(abs(Y-(${cy}+${H * 0.05}*sin(X*0.05))),${H * 0.4}),255,0)`; break;
      case "octagon": alphaExpr = `if(lte(hypot(X-${cx},Y-${cy}),${W * 0.4}*cos(PI/8)/cos(mod(atan2(Y-${cy},X-${cx}),PI/4)-PI/8)),255,0)`; break;
      case "pentagon": alphaExpr = `if(lte(hypot(X-${cx},Y-${cy}),${W * 0.4}*cos(PI/5)/cos(mod(atan2(Y-${cy},X-${cx}),2*PI/5)-PI/5)),255,0)`; break;
      case "ellipse": alphaExpr = `if(lte(((X-${cx})*(X-${cx}))/(${W * 0.45 * (W * 0.45)})+((Y-${cy})*(Y-${cy}))/(${H * 0.4 * (H * 0.4)}),1),255,0)`; break;
      case "cross": alphaExpr = `if(gt(lte(abs(X-${cx}),${W * 0.15})*lte(abs(Y-${cy}),${H * 0.45})+lte(abs(Y-${cy}),${H * 0.15})*lte(abs(X-${cx}),${W * 0.45}),0),255,0)`; break;
      case "heart": alphaExpr = `if(lte(pow((X-${cx})/(${W * 0.3})*(X-${cx})/(${W * 0.3})+(Y-${cy})/(${H * 0.3})*(Y-${cy})/(${H * 0.3})-1,3)-((X-${cx})/(${W * 0.3})*(X-${cx})/(${W * 0.3}))*pow((Y-${cy})/(${H * 0.3}),3),0),255,0)`; break;
    }
    if (alphaExpr) filters.push(`geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${alphaExpr}'`);
  }

  if (shape === "border") filters.push(`drawbox=x=0:y=0:w=${W}:h=${H}:color=white@0.9:t=10`);
  if (shape === "frame") filters.push(`drawbox=x=15:y=15:w=${W - 30}:h=${H - 30}:color=white@0.7:t=8`);
  filters.push("format=yuva420p");
  return filters.join(",");
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "sticker";
  const args = (ctx.args || []).filter(Boolean);

  try {
    if (args[0] === "-list") {
      return kit.reply(sock, msg, LIST_TEXT(usedPrefix, command));
    }

    const source = kit.getSource(msg);
    const media = kit.getMedia(source);
    const mime = media?.mimetype || "";
    const meta = sk.resolveMeta(sock, msg, ctx);

    let urlArg = null;
    const argsWithoutUrl = [];
    for (const arg of args) {
      if (URL_REGEX.test(arg)) urlArg = arg;
      else argsWithoutUrl.push(arg);
    }

    const filteredText = argsWithoutUrl.join(" ").replace(/-\w+/g, "").trim();
    const marca = filteredText.split(/[•|]/).map((part) => part.trim());
    const pack = marca[0] || meta.packname;
    const author = marca.length > 1 ? marca[1] : filteredText ? (meta.custom ? meta.author : "") : meta.author;

    const effects = [];
    for (const arg of argsWithoutUrl) {
      if (SHAPE_ARGS[arg]) effects.push({ type: "shape", value: SHAPE_ARGS[arg] });
      else if (EFFECT_ARGS[arg]) effects.push({ type: "effect", value: EFFECT_ARGS[arg] });
    }

    const filter = buildFilters(effects);

    const send = async (webpBuffer) => {
      const finalBuffer = await sk.addExif(webpBuffer, pack, author, [""]);
      await sock.sendMessage(chatId, { sticker: finalBuffer }, { quoted: msg });
    };

    const fromImage = async (buffer, ext, animated) => {
      await send(await sk.encodeWebp(buffer, { ext, filter, animated }));
    };

    const fromWebp = async (buffer) => {
      const animated = sk.isAnimatedWebp(buffer);
      if (animated && effects.length === 0) return send(buffer);
      if (animated) {
        try {
          return await fromImage(buffer, "webp", true);
        } catch {
          return send(buffer);
        }
      }
      return fromImage(buffer, "webp", false);
    };

    if (media && (media.type === "image" || /webp/i.test(mime))) {
      const buffer = await kit.downloadMedia(media);
      if (/webp/i.test(mime)) return await fromWebp(buffer);
      const ext = /png/i.test(mime) ? "png" : /jpe?g/i.test(mime) ? "jpg" : /gif/i.test(mime) ? "gif" : "img";
      return await fromImage(buffer, ext, /gif/i.test(mime));
    }

    if (media && media.type === "video") {
      if ((media.node.seconds || 0) > 20) {
        return kit.reply(sock, msg, "《✧》 El video no puede ser muy largo");
      }
      const buffer = await kit.downloadMedia(media);
      return await fromImage(buffer, "mp4", true);
    }

    if (urlArg) {
      if (!urlArg.match(/\.(jpe?g|png|gif|webp|mp4|mov|avi|mkv|webm)(\?.*)?$/i)) {
        return kit.reply(sock, msg, "《✧》 La URL debe ser de una imagen (jpg, png, gif, webp) o video (mp4, mov, avi, mkv, webm)");
      }
      const response = await fetch(urlArg);
      if (!response.ok) return kit.reply(sock, msg, "《✧》 No pude descargar ese archivo desde la URL.");
      const buffer = Buffer.from(await response.arrayBuffer());
      if (/\.webp(\?.*)?$/i.test(urlArg)) return await fromWebp(buffer);
      if (/\.gif(\?.*)?$/i.test(urlArg)) return await fromImage(buffer, "gif", true);
      if (/\.(jpe?g|png)(\?.*)?$/i.test(urlArg)) return await fromImage(buffer, "png", false);
      return await fromImage(buffer, "mp4", true);
    }

    return kit.reply(
      sock,
      msg,
      `《✧》 Por favor, envía una imagen, video, sticker o URL para hacer un sticker.\n> Usa *${usedPrefix + command} -list* para ver formas y efectos`
    );
  } catch (e) {
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["sticker", "s"];
handler.description = "Convertir una imagen o video a sticker.";
handler.category = "Stickers";
module.exports = handler;
