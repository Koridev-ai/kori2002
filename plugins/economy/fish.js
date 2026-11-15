"use strict";

const actions = require("../../libs/ecoactions");

module.exports = actions.gatherPlugin({
  commands: ["pescar", "fish"],
  description: "Ganar coins pescando.",
  name: "fish",
  key: "fish",
  bag: "tools",
  tool: "caña",
  toolName: "Caña de pescar",
  toolText: "una Caña de pescar",
  buyText: "una",
  newText: "una nueva",
  removed: "eliminada",
  verb: "pescar",
  again: "pescar",
  energy: "energía",
  needEnergy: "salir de pescar",
  win: [6000, 8000],
  lose: [5000, 6500],
  cooldown: 8 * 60 * 1000
});
