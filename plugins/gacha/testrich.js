"use strict";

const gacha = require("../../libs/gachakit");
const { sendRichHtml } = require("../../libs/richhtml");

const HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif;background:#dbeafe;padding:24px;text-align:center}h1{color:#0369a1}button{padding:10px 18px;border-radius:12px;border:0;background:#0ea5e9;color:#fff;font-size:16px}</style></head><body><h1>Test rich OK</h1><p id="c">0</p><button onclick="document.getElementById('c').textContent=Number(document.getElementById('c').textContent)+1">Sumar</button></body></html>`;

module.exports = gacha.define({
  commands: ["testrich"],
  description: "Prueba mínima de HTML interactivo.",
  run: async ({ sock, msg, chatId }) => {
    await sendRichHtml(sock, chatId, "Test rich", HTML, { quoted: msg });
  }
});
