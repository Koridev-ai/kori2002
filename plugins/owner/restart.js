"use strict";

const fs = require("fs");
const path = require("path");
const kit = require("../../libs/pluginkit");

const RESTARTER_FILE = path.resolve(__dirname, "..", "..", "src", "lastRestarter.json");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;

  if (!msg.key.fromMe && !global.isOwner(ctx.sender || "")) {
    return kit.reply(sock, msg, "《✧》 Este comando es solo para el owner.");
  }

  await kit.reply(sock, msg, "✎ Reiniciando el Socket...\n> *Espere un momento...*");

  try {
    fs.writeFileSync(RESTARTER_FILE, JSON.stringify({ chatId }, null, 2));
  } catch (e) {
    console.error("❌ No se pudo guardar lastRestarter.json:", e.message);
  }

  setTimeout(() => {
    if (process.send) process.send("restart");
    else process.exit(0);
  }, 3000);
};

handler.command = ["restart"];
handler.description = "Reiniciar el socket del bot.";
handler.category = "Owner";
module.exports = handler;
