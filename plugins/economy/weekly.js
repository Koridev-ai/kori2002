"use strict";

const eco = require("../../libs/ecokit");

module.exports = eco.claimPlugin({
  commands: ["weekly", "semanal"],
  description: "Reclamar tu recompensa semanal.",
  name: "weekly",
  label: "semanal",
  gap: 7 * 86400000,
  maxStreak: 30,
  base: 40000,
  step: 5000,
  cap: 185000,
  glyph: "❁",
  unit: "Semana",
  streakField: "weeklyStreak",
  lastField: "lastWeeklyGlobal"
});
