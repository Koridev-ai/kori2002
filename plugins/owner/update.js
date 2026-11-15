"use strict";

const { exec } = require("child_process");
const path = require("path");
const kit = require("../../libs/pluginkit");

const ROOT = path.resolve(__dirname, "..", "..");

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "update";

  if (!(msg.key.fromMe && !ctx.isSub) && !global.isOwner(ctx.sender || "")) {
    return kit.reply(sock, msg, "《✧》 Este comando es solo para el owner.");
  }

  exec("git pull", { cwd: ROOT }, async (error, stdout, stderr) => {
    try {
      if (error && !stdout) {
        return await kit.reply(sock, msg, `《✧》 No se pudo actualizar.\n> ${(stderr || error.message).trim()}`);
      }
      const total = typeof global.__reloadPlugins === "function" ? global.__reloadPlugins() : null;
      const reloaded = total === null ? "" : `\n> Comandos recargados » *${total}*`;
      const text = stdout.includes("Already up to date.")
        ? `ꕥ *Estado:* Todo está actualizado${reloaded}`
        : `*Actualización completada*\n\n${stdout}${reloaded}`;
      await kit.reply(sock, msg, text);
    } catch (e) {
      await kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
    }
  });
};

handler.command = ["fix", "update"];
handler.description = "Actualizar y recargar los comandos del bot.";
handler.category = "Owner";
module.exports = handler;
