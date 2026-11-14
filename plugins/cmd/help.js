"use strict";

const fs = require("fs");
const path = require("path");

const BOT_TITLE = "CORTANA 2.0 BOT";

const VIEWS = {
  menu: "main",
  help: "main",
  allmenu: "all",
  menuaudio: "media"
};

const VIEW_TITLES = {
  main: "MENÚ PRINCIPAL",
  media: "MENÚ MULTIMEDIA Y GUARDADO",
  all: "TODOS LOS COMANDOS"
};

const HIDDEN = new Set(["menu", "help", "allmenu", "menuaudio", "subbots", "speedtest"]);

const CATEGORIES = [
  {
    id: "info",
    title: "📜 INFORMACIÓN",
    items: [
      ["info", "Información del bot"],
      ["creador", "Contacto del creador"],
      ["perfil", "Foto de perfil de un usuario"],
      ["ping", "Latencia del bot"],
      ["pong", "Estado del bot y del servidor"],
      ["p", "Uso de RAM, CPU y discos"],
      ["speed", "Prueba de velocidad"]
    ]
  },
  {
    id: "media",
    title: "🎵 MULTIMEDIA Y GUARDADO",
    items: [
      ["guar", "Guarda un multimedia con una clave"],
      ["g", "Recupera un multimedia guardado"],
      ["kill", "Elimina un multimedia guardado"],
      ["get", "Descarga un estado de WhatsApp"],
      ["ver", "Reenvía la imagen, video o nota de voz citada"]
    ]
  },
  {
    id: "lid",
    title: "🆔 NÚMEROS Y LID",
    items: [
      ["verlid", "Estado de LID de los miembros del grupo"],
      ["damelid", "LID y número de un usuario"]
    ]
  },
  {
    id: "admin",
    title: "🛠️ ADMINISTRACIÓN",
    restricted: true,
    items: [
      ["setprefix", "Cambia el prefijo"],
      ["botname", "Cambia el nombre del bot"],
      ["botfoto", "Cambia la foto del bot"],
      ["modoprivado", "Activa o desactiva el modo privado"],
      ["apagar", "Apaga el bot en el grupo"],
      ["prender", "Activa el bot en el grupo"],
      ["rest", "Reinicia el servidor"],
      ["bc", "Difunde un mensaje citado"],
      ["re", "Restringe un comando en el grupo"],
      ["unre", "Quita la restricción de un comando"],
      ["limpiar", "Limpia los registros de antidelete"]
    ]
  },
  {
    id: "subbots",
    title: "🤖 SUBBOTS",
    restricted: true,
    items: [
      ["bots", "Lista de subbots conectados"],
      ["cosubbots", "Analiza subbots corruptos"],
      ["delprefix", "Elimina el prefijo de un subbot"],
      ["delsesion", "Limpia la carpeta de sesión"]
    ]
  },
  {
    id: "maintenance",
    title: "🧰 MANTENIMIENTO",
    restricted: true,
    items: [
      ["carga", "Actualiza el bot desde git"],
      ["git", "Muestra el código de un comando"],
      ["linia", "Línea de un comando en main.js"],
      ["deltmp", "Limpia la carpeta tmp"],
      ["lidreal", "Número real detrás de un LID"]
    ]
  }
];

const VIEW_CATEGORIES = {
  main: ["info", "media", "lid"],
  media: ["media"],
  all: null
};

let cachedCommands = null;

function loadedCommands() {
  if (cachedCommands) return cachedCommands;
  const names = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".js")) continue;
      try {
        const plugin = require(full);
        if (!plugin || !plugin.command) continue;
        const list = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
        for (const name of list) {
          if (typeof name === "string") names.add(name.toLowerCase());
        }
      } catch {
        continue;
      }
    }
  };
  walk(path.join(__dirname, ".."));
  cachedCommands = names;
  return names;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function renderCategory(category, prefix, available) {
  const lines = category.items
    .filter(([name]) => available.has(name))
    .map(([name, description]) => (description ? `│ ▸ *${prefix}${name}* — ${description}` : `│ ▸ *${prefix}${name}*`));
  if (!lines.length) return "";
  return `╭─〔 ${category.title} 〕\n${lines.join("\n")}\n╰────────────⬣`;
}

function uncategorized(available) {
  const known = new Set(CATEGORIES.flatMap((category) => category.items.map(([name]) => name)));
  const extra = [...available].filter((name) => !known.has(name) && !HIDDEN.has(name)).sort();
  if (!extra.length) return null;
  return { id: "other", title: "📦 OTROS", items: extra.map((name) => [name, ""]) };
}

function buildMenu(view, prefix, jid) {
  const available = loadedCommands();
  const wanted = VIEW_CATEGORIES[view];
  const categories = wanted ? CATEGORIES.filter((category) => wanted.includes(category.id)) : [...CATEGORIES];
  if (view === "all") {
    const other = uncategorized(available);
    if (other) categories.push(other);
  }

  const header = [
    `╭━〔 *${BOT_TITLE}* 〕━⬣`,
    `│ 👋 Hola, @${jid.split("@")[0]}`,
    `│ 📖 ${VIEW_TITLES[view]}`,
    `│ 🔹 Prefijo: *${prefix}*`,
    `│ ⏱️ Activo: ${formatUptime(process.uptime())}`,
    "╰━━━━━━━━━━━━⬣"
  ].join("\n");

  const body = categories.map((category) => renderCategory(category, prefix, available)).filter(Boolean).join("\n\n");

  const footers = {
    main: `💡 *${prefix}allmenu* — todos los comandos\n💡 *${prefix}menuaudio* — multimedia y guardado`,
    media: `↩️ *${prefix}menu* — volver al menú principal`,
    all: "🔒 Los bloques de administración, subbots y mantenimiento requieren ser owner o admin."
  };

  return [header, body, footers[view]].filter(Boolean).join("\n\n");
}

async function reply(sock, msg, content) {
  const chat = msg.key.remoteJid;
  if (typeof sock.sendMessage2 === "function") return sock.sendMessage2(chat, content, msg);
  return sock.sendMessage(chat, content, { quoted: msg });
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const view = VIEWS[ctx.command] || "main";
  const prefix = ctx.usedPrefix || global.prefix || ".";
  const jid = ctx.sender || msg.key.participant || msg.key.remoteJid;

  await sock.sendMessage(msg.key.remoteJid, { react: { text: "📜", key: msg.key } }).catch(() => null);

  try {
    await reply(sock, msg, { text: buildMenu(view, prefix, jid), mentions: [jid] });
  } catch (error) {
    console.error("❌ Error al mostrar el menú:", error);
    await sock.sendMessage(
      msg.key.remoteJid,
      { text: "❌ *Ocurrió un error al mostrar el menú. Inténtalo de nuevo.*" },
      { quoted: msg }
    );
  }
};

handler.command = ["menu", "help", "allmenu", "menuaudio"];
module.exports = handler;
