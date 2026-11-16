"use strict";

const eco = require("./ecokit");
const gdb = require("./groupdb");

const LIMITS = { facil: 10, medio: 50, dificil: 90, imposible: 100, imposible2: 160 };
const REWARDS = { facil: [500, 1000], medio: [1000, 2000], dificil: [2000, 3500], imposible: [3500, 4800], imposible2: [5000, 6500] };
const games = new Map();

function makeProblem(difficulty) {
  const max = LIMITS[difficulty];
  const op = eco.pick(["+", "-", "*", "/"]);
  let a = eco.rand(1, max);
  let b = eco.rand(1, max);
  let result;
  if (op === "/") {
    b = eco.rand(1, Math.min(max, 12));
    a = b * eco.rand(1, max);
    result = a / b;
  } else if (op === "+") result = a + b;
  else if (op === "-") result = a - b;
  else result = a * b;
  const symbol = op === "*" ? "×" : op === "/" ? "÷" : op;
  return { text: `${a} ${symbol} ${b}`, result };
}

function isActive(chatId) {
  return games.has(chatId);
}

async function start(sock, msg, chatId, difficulty) {
  const { text, result } = makeProblem(difficulty);
  const timer = setTimeout(() => {
    if (games.get(chatId)?.timer === timer) {
      games.delete(chatId);
      sock.sendMessage(chatId, { text: `「✿」Tiempo agotado. La respuesta era *${result}*.` }, { quoted: msg }).catch(() => null);
    }
  }, 60000);
  if (timer.unref) timer.unref();
  games.set(chatId, { answer: result, attempts: 0, difficulty, timer });
  return text;
}

async function check(sock, msg, text, jid) {
  const chatId = msg.key.remoteJid;
  const game = games.get(chatId);
  if (!game) return;
  const raw = String(text || "").trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return;
  const chat = gdb.chat(chatId);
  if (chat.adminonly || !chat.economy) return;
  if (parseFloat(raw) === game.answer) {
    const [min, max] = REWARDS[game.difficulty];
    const reward = eco.rand(min, max);
    eco.account(jid).coins += reward;
    eco.save();
    clearTimeout(game.timer);
    games.delete(chatId);
    await sock.sendMessage(chatId, { text: `「❀」Respuesta correcta.\n> *Ganaste ›* ¥${reward.toLocaleString()}` }, { quoted: msg });
    return;
  }
  game.attempts += 1;
  if (game.attempts >= 3) {
    clearTimeout(game.timer);
    games.delete(chatId);
    await sock.sendMessage(chatId, { text: "「✎」Te quedaste sin intentos. Suerte a la próxima." }, { quoted: msg });
  } else {
    await sock.sendMessage(chatId, { text: `「✎」Respuesta incorrecta, te quedan ${3 - game.attempts} intentos.` }, { quoted: msg });
  }
}

module.exports = { LIMITS, isActive, start, check };
