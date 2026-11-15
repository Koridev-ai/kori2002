"use strict";

const { format } = require("util");
const kit = require("../../libs/pluginkit");

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
const MAX_PRINTS = 15;

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const command = ctx.command || "ex";
  const args = ctx.args || [];
  const text = (ctx.text || "").trim();

  if (!(msg.key.fromMe && !ctx.isSub) && !global.isOwner(ctx.sender || "")) {
    return kit.reply(sock, msg, "《✧》 Este comando es solo para el owner.");
  }
  if (!text) return kit.reply(sock, msg, "《✧》 Debes escribir un comando a ejecutar.");

  const code = (command === "e" ? "return " : "") + text;
  let result;
  let remaining = MAX_PRINTS;

  try {
    await kit.react(sock, msg, "🕒");
    const module_ = { exports: {} };
    const fn = new AsyncFunction("print", "msg", "sock", "require", "Array", "process", "args", "module", "exports", "argument", code);
    result = await fn.call(
      sock,
      (...parts) => {
        if (--remaining < 1) return;
        return kit.reply(sock, msg, format(...parts));
      },
      msg,
      sock,
      require,
      Array,
      process,
      args,
      module_,
      module_.exports,
      [sock]
    );
    await kit.react(sock, msg, "✔️");
  } catch (e) {
    result = e;
    await kit.react(sock, msg, "✖️");
  } finally {
    await kit.reply(sock, msg, format(result));
  }
};

handler.command = ["ex", "e"];
handler.description = "Ejecutar código JavaScript en el bot.";
handler.category = "Owner";
module.exports = handler;
