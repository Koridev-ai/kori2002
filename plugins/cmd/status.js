"use strict";

const os = require("os");
const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");
const main = require("../../libs/mainkit");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "status";

  try {
    const users = pdb.all();
    const totalCommands = users.reduce((acc, user) => acc + (user.usedcommands || 0), 0);
    const groups = await sock
      .groupFetchAllParticipating()
      .then((all) => Object.keys(all || {}).length)
      .catch(() => 0);
    const hostId = process.env.HOSTNAME ? process.env.HOSTNAME.split("-")[0] : "Default_host_id";
    const mem = process.memoryUsage();
    const botName = sock.user?.name || "Bot";

    const text = `「✧」 Estado de *${botName}* (●´ϖ\`●)
◇ *Usuarios registrados ›* ${users.length.toLocaleString()}
◇ *Grupos ›* ${groups.toLocaleString()}
◇ *Comandos ejecutados ›* ${main.compact(totalCommands)}

➭ Estado del Servidor *₍ᐢ..ᐢ₎♡*

❖ *Sistema ›* ${os.type()}
❖ *CPU ›* ${os.cpus().length} cores
❖ *RAM ›* ${main.formatBytes(os.totalmem())}
❖ *RAM Usado ›* ${main.formatBytes(os.totalmem() - os.freemem())}
❖ *Arquitectura ›* ${os.arch()}
❖ *Host ID ›* ${hostId}

*❑ Uso de Memoria NODEJS*
◆ *Ram Utilizada* › ${main.formatBytes(mem.rss)}
◆ *Heap Reservado* › ${main.formatBytes(mem.heapTotal)}
◆ *Heap Usado* › ${main.formatBytes(mem.heapUsed)}
◆ *Módulos Nativos* › ${main.formatBytes(mem.external)}
◆ *Buffers de Datos* › ${main.formatBytes(mem.arrayBuffers)}`;

    return kit.reply(sock, msg, text, { mentions: [pdb.selfJid(msg)] });
  } catch (e) {
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["status", "estado"];
handler.description = "Ver el estado del bot.";
handler.category = "General";
module.exports = handler;
