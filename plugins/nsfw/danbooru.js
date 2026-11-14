"use strict";

const nsfw = require("../../libs/nsfwkit");

module.exports = nsfw.booruPlugin({
  commands: ["danbooru", "dbooru"],
  description: "Buscar imágenes en Danbooru.",
  sources: ["danbooru"]
});
