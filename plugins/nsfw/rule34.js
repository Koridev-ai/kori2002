"use strict";

const nsfw = require("../../libs/nsfwkit");

module.exports = nsfw.booruPlugin({
  commands: ["r34", "rule34", "rule"],
  description: "Buscar imágenes NSFW por personaje o tags.",
  sources: ["danbooru", "xbooru", "konachan", "yandere"]
});
