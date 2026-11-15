"use strict";

const actions = require("../../libs/ecoactions");

module.exports = actions.gatherPlugin({
  commands: ["cazar", "hunt"],
  description: "Cazar animales para ganar coins.",
  name: "hunt",
  key: "hunt",
  bag: "weapons",
  tool: "arco",
  toolName: "Arco",
  toolText: "un Arco",
  buyText: "uno",
  newText: "uno nuevo",
  removed: "eliminado",
  verb: "cazar",
  again: "cazar",
  energy: "stamina",
  needEnergy: "cazar",
  win: [10000, 13000],
  lose: [6000, 8000],
  cooldown: 15 * 60 * 1000
});
