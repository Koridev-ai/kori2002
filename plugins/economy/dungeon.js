"use strict";

const actions = require("../../libs/ecoactions");

module.exports = actions.questPlugin({
  commands: ["dungeon", "mazmorra"],
  description: "Explorar mazmorras para ganar coins.",
  name: "dungeon",
  key: "dungeon",
  weapon: "hacha",
  weaponName: "Hacha",
  gender: "a",
  staminaText: "volver asaltar la mazmorra",
  healthText: "volver a la *mazmorra*",
  againText: "volver a la mazmorra",
  damage: 15,
  win: [12000, 15000],
  lose: [7500, 9000],
  cooldown: 17 * 60 * 1000
});
