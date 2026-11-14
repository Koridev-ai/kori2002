"use strict";

const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

const HOBBIES = [
  "📚 Leer", "✍️ Escribir", "🎤 Cantar", "💃 Bailar", "🎮 Jugar",
  "🎨 Dibujar", "🍳 Cocinar", "✈️ Viajar", "🏊 Nadar", "📸 Fotografía",
  "🎧 Escuchar música", "🏀 Deportes", "🎬 Ver películas", "🌿 Jardinería",
  "🧵 Manualidades", "🎲 Juegos de mesa", "🏋️‍♂️ Gimnasio", "🚴 Ciclismo",
  "🎯 Tiro con arco", "🍵 Ceremonia del té", "🧘‍♂️ Meditación", "🎪 Malabares",
  "🛠️ Bricolaje", "🎹 Tocar instrumentos", "🐶 Cuidar mascotas", "🌌 Astronomía",
  "♟️ Ajedrez", "🍷 Catación de vinos", "🛍️ Compras", "🏕️ Acampar",
  "🎣 Pescar", "📱 Tecnología", "🎭 Teatro", "🍽️ Gastronomía", "🏺 Coleccionar",
  "✂️ Costura", "🧁 Repostería", "📝 Blogging", "🚗 Automóviles", "🧩 Rompecabezas",
  "🎳 Bolos", "🏄 Surf", "⛷️ Esquí", "🎿 Snowboard", "🤿 Buceo", "🏹 Tiro al blanco",
  "🧭 Orientación", "🏇 Equitación", "🎨 Pintura", "📊 Invertir", "🌡️ Meteorología",
  "🔍 Investigar", "💄 Maquillaje", "💇‍♂️ Peluquería", "🛌 Dormir", "🍺 Cervecería",
  "🪓 Carpintería", "🧪 Experimentos", "📻 Radioafición", "🗺️ Geografía", "💎 Joyería",
  "Otro 🌟"
];

const clean = (value) => value.replace(/[^\p{L}\p{N}\s]/gu, "").toLowerCase().trim();

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const input = (ctx.args || []).join(" ").trim();
  const jid = pdb.selfJid(msg);
  const user = pdb.get(jid);

  if (!input) {
    let list = "🎯 *Elige un pasatiempo:*\n\n";
    HOBBIES.forEach((hobby, index) => {
      list += `${index + 1}) ${hobby}\n`;
    });
    list += `\n*Ejemplos:*\n${usedPrefix}setpasatiempo 1\n${usedPrefix}setpasatiempo Leer\n${usedPrefix}setpasatiempo "Otro 🌟"`;
    return kit.reply(sock, msg, list);
  }

  let selected = "";
  if (/^\d+$/.test(input)) {
    const index = parseInt(input) - 1;
    if (index < 0 || index >= HOBBIES.length) {
      return kit.reply(sock, msg, `《✧》 Número inválido. Selecciona un número entre 1 y ${HOBBIES.length}`);
    }
    selected = HOBBIES[index];
  } else {
    const needle = clean(input);
    const found = needle ? HOBBIES.find((h) => clean(h).includes(needle)) : null;
    if (!found) return kit.reply(sock, msg, "《✧》 Pasatiempo no encontrado. Usa el comando sin argumentos para ver la lista disponible.");
    selected = found;
  }

  if (user.pasatiempo === selected) {
    return kit.reply(sock, msg, `《✧》 Ya tienes establecido este pasatiempo: *${user.pasatiempo}*`);
  }

  pdb.set(jid, "pasatiempo", selected);
  return kit.reply(sock, msg, `✐ Se ha establecido tu pasatiempo:\n> *${selected}*`);
};

handler.command = ["setpasatiempo", "sethobby"];
handler.description = "Establecer tu pasatiempo.";
handler.category = "Perfil";
module.exports = handler;
