"use strict";

const eco = require("../../libs/ecokit");

module.exports = eco.claimPlugin({
  commands: ["monthly", "mensual"],
  description: "Reclamar tu recompensa mensual.",
  name: "monthly",
  label: "mensual",
  gap: 30 * 86400000,
  maxStreak: 8,
  base: 60000,
  step: 5000,
  cap: 95000,
  glyph: "❁",
  unit: "Mes",
  streakField: "monthlyStreak",
  lastField: "lastMonthlyGlobal"
});
