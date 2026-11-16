"use strict";

const subbot = require("../../libs/subbot");
const sockkit = require("../../libs/sockkit");

module.exports = sockkit.define({
  commands: ["delsub", "removesub"],
  description: "Eliminar un Sub-Bot y su sesión.",
  access: "global",
  run: async ({ args, usedPrefix, command, reply }) => {
    const number = subbot.normalizePhone(args[0]);
    if (!subbot.isValidPhone(number)) return reply(`✐ Indica el número del Sub-Bot a eliminar.\n> Ejemplo: *${usedPrefix}${command} 573001234567*`);
    const entry = subbot.findEntry(number);
    const target = entry ? entry.id : number;
    const exists = !!entry || subbot.savedSessions().includes(target);
    if (!exists) return reply("✐ No existe ningún Sub-Bot con ese número.");
    const sock = entry?.sock;
    if (sock) await sock.logout().catch(() => null);
    await subbot.stopSub(target, { remove: true });
    return reply(`✿ Se eliminó el Sub-Bot *${number}* y su sesión.`);
  }
});
