"use strict";

const sockkit = require("../../libs/sockkit");

module.exports = sockkit.define({
  commands: ["leave", "salir"],
  description: "Hacer que el bot salga de un grupo.",
  run: async ({ sock, msg, args, reply }) => {
    const groupId = args[0] && args[0].endsWith("@g.us") ? args[0] : msg.key.remoteJid;
    if (!groupId.endsWith("@g.us")) return reply("《✧》 Usa este comando en un grupo o indica el ID del grupo.");
    await sock.groupLeave(groupId);
  }
});
