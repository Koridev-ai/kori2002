"use strict";

const actions = require("../../libs/ecoactions");

module.exports = actions.questPlugin({
  commands: ["adventure", "aventura"],
  description: "Ir de aventuras para ganar coins.",
  name: "adventure",
  key: "adventure",
  weapon: "espada",
  weaponName: "Espada",
  gender: "a",
  staminaText: "salir de aventura",
  healthText: "volver a *aventurarte*",
  againText: "volver a la aventura",
  damage: 20,
  win: [14000, 18000],
  lose: [9000, 11000],
  cooldown: 20 * 60 * 1000
});
