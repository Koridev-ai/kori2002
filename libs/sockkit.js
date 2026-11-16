"use strict";

const kit = require("./pluginkit");
const botconf = require("./botconf");

const DENIED = "《✧》 Este comando solo puede ser ejecutado por un Socket.";
const SUB_ONLY = "《✧》 Este comando solo puede usarse desde una instancia de Sub-Bot.";
const GLOBAL_ONLY = "《✧》 Este comando es solo para el owner.";

function allowed(access, ctx) {
  const role = ctx.role || "none";
  if (access === "any") return true;
  if (access === "global") return role === "global" || (ctx.isMain && role === "self");
  return role === "self" || role === "owner" || role === "global";
}

function define({ commands, description, access = "owner", subOnly = false, run }) {
  const handler = async (msg, ctx = {}) => {
    const sock = ctx.conn;
    const usedPrefix = ctx.usedPrefix !== undefined ? ctx.usedPrefix : global.prefix || ".";
    const command = ctx.command || commands[0];
    try {
      if (!allowed(access, ctx)) return await kit.reply(sock, msg, access === "global" ? GLOBAL_ONLY : DENIED);
      if (subOnly && !ctx.isSub) return await kit.reply(sock, msg, SUB_ONLY);
      const args = (ctx.args || []).filter(Boolean);
      const botId = ctx.botId || botconf.number(sock.user?.id);
      return await run({
        sock,
        msg,
        ctx,
        usedPrefix,
        command,
        args,
        text: args.join(" "),
        botId,
        settings: botconf.get(botId),
        role: ctx.role || "none",
        reply: (text, extra) => kit.reply(sock, msg, text, extra)
      });
    } catch (error) {
      return kit.reply(sock, msg, kit.errorText(usedPrefix, command, error)).catch(() => null);
    }
  };
  handler.command = commands;
  handler.description = description;
  handler.category = "Sub-Bot";
  return handler;
}

module.exports = { define, allowed };
