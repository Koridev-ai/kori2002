"use strict";

const subbot = require("../../libs/subbot");
const sockkit = require("../../libs/sockkit");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = sockkit.define({
  commands: ["reload"],
  description: "Reiniciar la conexión del Sub-Bot.",
  subOnly: true,
  run: async ({ botId, reply }) => {
    const entry = subbot.findEntry(botId);
    if (!entry) return reply("《✧》 No se encontró la sesión de este Sub-Bot.");
    const folderId = entry.id;
    await reply("✿ *Reiniciando la sesión del bot...*");
    await sleep(1000);
    await subbot.stopSub(botId, { remove: false });
    await sleep(1500);
    await subbot.startSub({ number: folderId });
  }
});
