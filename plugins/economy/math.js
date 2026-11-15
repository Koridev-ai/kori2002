"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const game = require("../../libs/ecomath");

module.exports = eco.define({
  commands: ["math", "mates"],
  description: "Iniciar un juego de matemáticas.",
  run: async ({ sock, msg, chatId, args }) => {
    if (game.isActive(chatId)) return kit.reply(sock, msg, "ꕥ Ya hay un juego activo. Espera a que termine.");
    const difficulty = (args[0] || "").toLowerCase();
    if (!game.LIMITS[difficulty]) return kit.reply(sock, msg, "「✎」Especifica una dificultad válida: *facil, medio, dificil, imposible, imposible2*");
    const problem = await game.start(sock, msg, chatId, difficulty);
    return kit.reply(sock, msg, `「✩」Tienes 1 minuto para resolver:\n\n> ✩ *${problem}*\n\n_✐ Responde con el número correcto!_`);
  }
});
