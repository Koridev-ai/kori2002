"use strict";

const fs = require("fs");
const path = require("path");
const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");
const avatar = require("../../libs/avatardb");

const DEFAULT_PICTURE = path.resolve(__dirname, "..", "..", "media", "perfil.jpg");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "profile";

  try {
    const userId = pdb.targetJid(msg);
    const user = pdb.get(userId);
    if (!user) return kit.reply(sock, msg, "✎ El usuario *mencionado* no está *registrado* en el bot");

    const name = user.name || pdb.key(userId);
    const birth = user.birth || "Sin especificar";
    const genero = user.genre || "Oculto";
    const pasatiempo = user.pasatiempo || "No definido";
    const comandos = user.usedcommands || 0;
    const desc = user.description ? `\n${user.description}` : "";
    const exp = user.exp || 0;
    const nivel = user.level || 0;

    let pareja = "Nadie";
    if (user.marry) pareja = pdb.peek(user.marry)?.name || "Alguien";
    const estadoCivil = genero === "Mujer" ? "Casada con" : genero === "Hombre" ? "Casado con" : "Casadx con";

    const { current, xp, percent } = pdb.progress(user);
    const rank = pdb.rank(userId);

    const custom = avatar.load(userId);
    const picture = custom ? null : await sock.profilePictureUrl(userId, "image").catch(() => null);

    const caption = `「✿」 *Perfil* ◢ ${name} ◤${desc}

♛ Cumpleaños › *${birth}*
⸙ Pasatiempo › *${pasatiempo}*
⚥ Género › *${genero}*
♡ ${estadoCivil} › *${pareja}*

✿ Nivel › *${nivel}*
❀ Experiencia › *${exp.toLocaleString()}*
➨ Progreso › *${current} => ${xp}* _(${percent}%)_
☆ Puesto › *#${rank}*

❒ Comandos ejecutados › *${comandos.toLocaleString()}*`;

    if (custom?.kind === "video") {
      return await sock.sendMessage(chatId, { video: custom.buffer, mimetype: "video/mp4", gifPlayback: true, caption }, { quoted: msg });
    }
    let image;
    if (custom) image = custom.buffer;
    else if (picture) image = { url: picture };
    else if (fs.existsSync(DEFAULT_PICTURE)) image = fs.readFileSync(DEFAULT_PICTURE);
    else image = { url: pdb.avatarFallback(name) };
    await sock.sendMessage(chatId, { image, caption }, { quoted: msg });
  } catch (e) {
    await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["profile", "perfil"];
handler.description = "Ver tu perfil o el de un usuario.";
handler.category = "Perfil";
module.exports = handler;
