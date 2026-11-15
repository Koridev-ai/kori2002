"use strict";

const gacha = require("../../libs/gachakit");
const kit = require("../../libs/pluginkit");
const job = require("../../libs/genjob");

module.exports = gacha.define({
  commands: ["gencancel", "gencancelar", "genstop"],
  description: "Cancela la generación de personajes en curso.",
  owner: true,
  run: async ({ sock, msg }) => {
    const active = job.getJob();
    if (!active) return kit.reply(sock, msg, "💤 No hay ninguna generación en curso.");
    if (!job.cancelJob()) return kit.reply(sock, msg, "🛑 La generación ya se está cancelando.");
    return kit.reply(sock, msg, `🛑 Cancelando *${active.label}*. Se detendrá en unos segundos.`);
  }
});
