const fs = require("fs");
const path = require("path");
require("./config");

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

global.__reloadPlugins = () => {
  const roots = [path.join(__dirname, "plugins") + path.sep, path.join(__dirname, "libs") + path.sep];
  for (const file of Object.keys(require.cache)) {
    if (roots.some((root) => file.startsWith(root))) delete require.cache[file];
  }
  const fresh = loadPlugins();
  plugins.splice(0, plugins.length, ...fresh);
  return fresh.length;
};

async function handleCommand(sock, msg, command, args, sender) {
  const lowerCommand = command.toLowerCase();
  const plugin = plugins.find((p) => p.command.includes(lowerCommand));
  if (!plugin) return;

  await require("./libs/profiledb").onCommand(sock, msg).catch(() => null);
  return plugin(msg, {
    conn: sock,
    wa: global.wa,
    text: args.join(" "),
    args,
    command: lowerCommand,
    usedPrefix: global.prefix,
    sender
  });
}

module.exports = { handleCommand };
