"use strict";

const actions = require("../../libs/ecoactions");

module.exports = actions.riskPlugin({
  commands: ["crime", "crimen"],
  description: "Ganar coins rápido.",
  name: "crime",
  key: "crime",
  chance: 0.4,
  win: [5500, 7500],
  lose: [4000, 6000],
  cooldown: 7 * 60 * 1000,
  waitText: (time) => `ꕥ Debes esperar *${time}* antes de intentar nuevamente.`
});
