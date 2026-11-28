const fs = require("fs");
const path = require("path");
require("./config");

const KEEP_LOADED = ["botconf.js", "dispatch.js", "subbot.js", "gmeta.js"].map((name) => path.join(__dirname, "libs", name));

function loadPlugins() {
  const plugins = [];
  const pluginDir = path.join(__dirname, "plugins");
  if (!fs.existsSync(pluginDir)) return plugins;

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".js")) {
        try {
          const plugin = require(full);
          if (plugin && plugin.command) plugins.push(plugin);
        } catch (e) {
          console.error(`❌ Error cargando plugin ${entry.name}:`, e.message);
        }
      }
    }
  };

  walk(pluginDir);
  return plugins;
}

const plugins = loadPlugins();
const index = new Map();

function buildIndex() {
  index.clear();
  for (const plugin of plugins) {
    for (const name of plugin.command) {
      if (!index.has(name)) index.set(name, plugin);
    }
  }
}

buildIndex();

global.__reloadPlugins = () => {
  const roots = [path.join(__dirname, "plugins") + path.sep, path.join(__dirname, "libs") + path.sep];
  for (const file of Object.keys(require.cache)) {
    if (KEEP_LOADED.includes(file)) continue;
    if (roots.some((root) => file.startsWith(root))) delete require.cache[file];
  }
  const fresh = loadPlugins();
  plugins.splice(0, plugins.length, ...fresh);
  buildIndex();
  return fresh.length;
};

function hasCommand(command) {
  return index.has(String(command || "").toLowerCase());
}

async function handleCommand(sock, msg, command, args, sender, extra = {}) {
  const lowerCommand = command.toLowerCase();
  const plugin = index.get(lowerCommand);
  if (!plugin) return;

  msg.__sub = !!extra.isSub;
  await require("./libs/profiledb").onCommand(sock, msg).catch(() => null);
  return plugin(msg, {
    conn: sock,
    wa: global.wa,
    text: args.join(" "),
    args,
    command: lowerCommand,
    usedPrefix: extra.usedPrefix !== undefined ? extra.usedPrefix : global.prefix,
    sender,
    isMain: extra.isMain !== undefined ? extra.isMain : true,
    isSub: !!extra.isSub,
    role: extra.role || "none",
    botId: extra.botId || "",
    settings: extra.settings || null
  });
}

module.exports = { handleCommand, hasCommand };
