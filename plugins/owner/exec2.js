"use strict";

const { exec: _exec } = require("child_process");
const { promisify } = require("util");
const kit = require("../../libs/pluginkit");

const exec = promisify(_exec);

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const text = (ctx.text || "").trim();

  if (!(msg.key.fromMe && !ctx.isSub) && !msg.__owner && !global.isOwner(ctx.sender || "")) {
    return kit.reply(sock, msg, "《✧》 Este comando es solo para el owner.");
  }
  if (!text) return kit.reply(sock, msg, "《✧》 Debes escribir un comando a ejecutar.");

  let output;
  try {
    await kit.react(sock, msg, "🕒");
    output = await exec(text);
    await kit.react(sock, msg, "✔️");
  } catch (e) {
    output = e;
    await kit.react(sock, msg, "✖️");
  }

  const { stdout, stderr } = output;
  if (stdout?.trim()) await kit.reply(sock, msg, stdout);
  if (stderr?.trim()) await kit.reply(sock, msg, stderr);
};

handler.command = ["r"];
handler.description = "Ejecutar comandos del sistema.";
handler.category = "Owner";
module.exports = handler;
