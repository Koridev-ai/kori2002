"use strict";

const nsfw = require("../../libs/nsfwkit");

module.exports = nsfw.booruPlugin({
  commands: ["gelbooru", "gbooru"],
  description: "Buscar imágenes NSFW por tags (Yande.re y Konachan).",
  sources: ["yandere", "konachan", "danbooru"]
});
