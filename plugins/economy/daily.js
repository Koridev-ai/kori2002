"use strict";

const eco = require("../../libs/ecokit");

module.exports = eco.claimPlugin({
  commands: ["daily", "diario"],
  description: "Reclamar tu recompensa diaria.",
  name: "daily",
  label: "diaria",
  gap: 86400000,
  maxStreak: 200,
  base: 20000,
  step: 5000,
  cap: 1015000,
  glyph: "✿",
  unit: "Día",
  streakField: "streak",
  lastField: "lastDailyGlobal"
});
