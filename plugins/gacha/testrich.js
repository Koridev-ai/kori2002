"use strict";

const gacha = require("../../libs/gachakit");
const { sendRichHtml } = require("../../libs/richhtml");

const HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif;background:#dbeafe;padding:24px;text-align:center}h1{color:#0369a1}</style></head><body><h1>Test rich OK</h1><p>Si ves esto, el transporte funciona.</p></body></html>`;

module.exports = gacha.define({
  commands: ["testrich"],
  description: "Prueba mínima de HTML interactivo.",
  run: async ({ sock, chatId, args }) => {
    const wrapped = args.includes("raw") ? false : true;
    await sendRichHtml(sock, chatId, "Test rich", HTML, { wrapped });
  }
});
