"use strict";

const eco = require("../../libs/ecokit");
const actions = require("../../libs/ecoactions");

module.exports = actions.riskPlugin({
  commands: ["slut", "prostituirse"],
  description: "Ganar coins con trabajos de riesgo.",
  name: "slut",
  key: "slut",
  chance: 0.5,
  win: [3500, 6000],
  lose: [2000, 4000],
  cooldown: 5 * 60 * 1000,
  waitText: (time) => `✿ Debes esperar *${time}* antes de intentar nuevamente.`
});
