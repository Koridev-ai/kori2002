"use strict";

const fs = require("fs");
const path = require("path");

const MENU_BANNER = path.join(__dirname, "..", "..", "media", "menu.jpg");
const FALLBACK_NAME = "Rem";
const DEFAULT_CATEGORY = "Otros";
const CATEGORY_ORDER = ["General", "Perfil", "Grupo", "Economía", "Descargas", "Stickers", "Utilidades", "Sub-Bot", "Owner"];

let cachedCommands = null;

function listCommands() {
  if (cachedCommands) return cachedCommands;
  const found = [];
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
        if (!plugin || !Array.isArray(plugin.command) || !plugin.command.length) continue;
        if (typeof plugin.description !== "string" || !plugin.description.trim()) continue;
        found.push({
          name: String(plugin.command[0]).toLowerCase(),
          aliases: plugin.command.slice(1).map((alias) => String(alias).toLowerCase()),
          description: plugin.description.trim(),
          category: typeof plugin.category === "string" && plugin.category.trim() ? plugin.category.trim() : DEFAULT_CATEGORY
        });
      } catch {
        continue;
      }
    }
  };
  walk(path.join(__dirname, ".."));
  cachedCommands = found.sort((a, b) => a.name.localeCompare(b.name));
  return cachedCommands;
}

function groupByCategory(commands) {
  const grouped = new Map();
  for (const command of commands) {
    const bucket = grouped.get(command.category) || [];
    bucket.push(command);
    grouped.set(command.category, bucket);
  }
  return grouped;
}

function orderedCategories(grouped) {
  const extra = [...grouped.keys()]
    .filter((name) => !CATEGORY_ORDER.includes(name) && name !== DEFAULT_CATEGORY)
    .sort((a, b) => a.localeCompare(b, "es"));
  return [...CATEGORY_ORDER, ...extra, DEFAULT_CATEGORY].filter((name) => grouped.has(name));
}

function renderCommand(command, prefix) {
  const aliasText = command.aliases.map((alias) => ` | \`${prefix}${alias}\``).join("");
  return `✧ \`${prefix}${command.name}\`${aliasText}\n> _${command.description}_\n`;
}

function renderCategory(name, commands, prefix) {
  let section = `» ˚୨•(🌸)• ⊹ \`${name}\` ⊹\n`;
  for (const command of commands) section += renderCommand(command, prefix);
  return `${section}\n`;
}

function buildMenu({ botName, prefix, isGroup, groupName, members }) {
  let header = `𝐇𝐨λ𝐚! 𝐒𝐨𝐲 ${botName}\n`;
  header += "ᴀǫᴜɪ ᴛɪᴇɴᴇs ʟᴀ ʟɪsᴛᴀ ᴅᴇ ᴄᴏᴍᴀɴᴅᴏs\n";
  header += "╭┈ ↷\n";
  header += "│ ✐ 𝓓𝓮𝔀𝓮𝓵𝓸𝓹𝓮𝓭 𝓫𝔂 𝙉𝙚𝙮𝙠𝒐𝒐𝙧 🌸\n";
  if (isGroup) {
    header += `│ ✐ ꒷ꕤ💎 𝐆𝐫𝐮𝐩𝐨: ${groupName}\n`;
    header += `│ ✐ ꒷ꕤ💎 𝐔𝐬𝐮𝐚𝐫𝐢𝐨𝐬: ${members}\n`;
  }
  header += "╰─────────────────\n\n";

  const grouped = groupByCategory(listCommands());
  let body = "";
  for (const category of orderedCategories(grouped)) {
    body += renderCategory(category, grouped.get(category), prefix);
  }

  return `${header}${body}━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const isGroup = chatId.endsWith("@g.us");
  const sender = ctx.sender || msg.key.participant || chatId;
  const prefix = ctx.usedPrefix || global.prefix || ".";

  let groupName = "Privado";
  let members = "1";
  if (isGroup) {
    const meta = await sock.groupMetadata(chatId).catch(() => null);
    groupName = meta?.subject || groupName;
    members = String(meta?.participants?.length ?? members);
  }

  const menuText = buildMenu({
    botName: sock.user?.name || FALLBACK_NAME,
    prefix,
    isGroup,
    groupName,
    members
  });
  const mentions = sender ? [sender] : [];

  try {
    await sock.sendMessage(chatId, { image: fs.readFileSync(MENU_BANNER), caption: menuText, mentions }, { quoted: msg });
  } catch (error) {
    console.error("❌ No se pudo enviar el menú con imagen:", error.message);
    await sock.sendMessage(chatId, { text: menuText, mentions }, { quoted: msg });
  }
};

handler.command = ["menu", "help", "ayuda"];
handler.description = "Muestra el listado de comandos disponibles";
handler.category = "General";
module.exports = handler;
