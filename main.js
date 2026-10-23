const fs = require("fs");
const chalk = require("chalk");
const { isOwner, setPrefix, allowedPrefixes } = require("./config");
const axios = require("axios");
const fetch = require("node-fetch");
const FormData = require("form-data");
// const { downloadContentFromMessage } = require("baileys"); // ← ESM: reemplazado por helper dinámico
const os = require("os");
const { execSync } = require("child_process");
const path = require("path");
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid, writeExif, toAudio } = require('./libs/fuctions');
const activeSessions = new Set();
const stickersDir = "./stickers";
const stickersFile = "./src/stickers.json";

// Parche ESM Baileys: helper para descargar media y obtener Buffer
async function downloadMedia(node, type) {
  const m = await import('baileys');
  const stream = await m.downloadContentFromMessage(node, type);
  let buf = Buffer.alloc(0);
  for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
  return buf;
}

function isUrl(string) {
  const regex = /^(https?:\/\/[^\s]+)/g;
  return regex.test(string);
}

const filePath = path.resolve('./src/activossubbots.json');
global.cachePlay10 = {}; // Guardará los datos de play10 por ID de mensaje
// Crear archivo con estructura inicial si no existe
if (!fs.existsSync(filePath)) {
  const estructuraInicial = {
    antilink: {}
    // futuro: modoAdmins: {}, antiarabe: {}
  };

  fs.writeFileSync(filePath, JSON.stringify(estructuraInicial, null, 2));
  console.log("✅ Archivo activossubbots.json creado correctamente.");
}
//retrimgir👇
const rePath = path.resolve("./src/re.json");
let comandosRestringidos = {};
if (fs.existsSync(rePath)) {
  try {
    comandosRestringidos = JSON.parse(fs.readFileSync(rePath, "utf-8"));
  } catch (e) {
    console.error("❌ Error al leer re.json:", e);
    comandosRestringidos = {};
  }
}
//retringir 👆
global.zrapi = `ex-9bf9dc0318`;
global.generatingCode = false;

if (!fs.existsSync(stickersDir)) fs.mkdirSync(stickersDir, { recursive: true });
if (!fs.existsSync(stickersFile)) fs.writeFileSync(stickersFile, JSON.stringify({}, null, 2));
//para los subot
const rutaLista = path.join(__dirname, "src", "listasubots.json");

// Verificar y crear el archivo si no existe
if (!fs.existsSync(rutaLista)) {
  fs.writeFileSync(rutaLista, JSON.stringify([], null, 2));
  console.log("✅ Archivo listasubots.json creado.");
} else {
  console.log("📂 Archivo listasubots.json ya existe.");
}
//para los subot
const prefixPath = path.resolve("src", "prefixes.json");

// Crear archivo si no existe
if (!fs.existsSync(prefixPath)) {
  fs.writeFileSync(prefixPath, JSON.stringify({}, null, 2));
  console.log("✅ prefixes.json creado correctamente.");
} else {
  console.log("✅ prefixes.json ya existe.");
}
//grupo subot
const grupoPath = path.resolve("src", "grupo.json");

// Verifica si el archivo existe, si no lo crea vacío con estructura básica
if (!fs.existsSync(grupoPath)) {
  fs.writeFileSync(grupoPath, JSON.stringify({}, null, 2));
  console.log("✅ grupo.json creado correctamente.");
} else {
  console.log("✅ grupo.json ya existe.");
}
//bienvemidad personalizada
const welcomePath = path.join(__dirname, 'src', 'welcome.json');

if (!fs.existsSync(welcomePath)) {
  fs.writeFileSync(welcomePath, JSON.stringify({}, null, 2));
  console.log("✅ Archivo welcome.json creado exitosamente.");
}

//grupo subot
const rpgFile = "./src/rpg.json";
if (!fs.existsSync(rpgFile)) {
    const rpgDataInicial = { usuarios: {}, tiendaMascotas: [], tiendaPersonajes: [], mercadoPersonajes: [] };
    fs.writeFileSync(rpgFile, JSON.stringify(rpgDataInicial, null, 2));
}
let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));
function saveRpgData() {
    fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));
}

const configFilePath = "./src/config.json";
function loadPrefix() {
    if (fs.existsSync(configFilePath)) {
        let configData = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));
        global.prefix = configData.prefix || ".";
    } else {
        global.prefix = ".";
    }
}
loadPrefix();
console.log(`📌 Prefijo actual: ${global.prefix}`);

const guarFilePath = "./src/guar.json";
if (!fs.existsSync(guarFilePath)) fs.writeFileSync(guarFilePath, JSON.stringify({}, null, 2));

function saveMultimedia(key, data) {
    let guarData = JSON.parse(fs.readFileSync(guarFilePath, "utf-8"));
    guarData[key] = data;
    fs.writeFileSync(guarFilePath, JSON.stringify(guarData, null, 2));
}
function getMultimediaList() {
    return JSON.parse(fs.readFileSync(guarFilePath, "utf-8"));
}
function isValidPrefix(prefix) {
    return typeof prefix === "string" && (prefix.length === 1 || (prefix.length > 1 && [...prefix].length === 1));
}
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    return res.json();
}
async function remini(imageData, operation) {
    return new Promise(async (resolve, reject) => {
        const availableOperations = ["enhance", "recolor", "dehaze"];
        if (!availableOperations.includes(operation)) operation = availableOperations[0];
        const baseUrl = `https://inferenceengine.vyro.ai/${operation}.vyro`;
        const formData = new FormData();
        formData.append("image", Buffer.from(imageData), { filename: "enhance_image_body.jpg", contentType: "image/jpeg" });
        formData.append("model_version", 1, {
            "Content-Transfer-Encoding": "binary",
            contentType: "multipart/form-data; charset=utf-8"
        });
        formData.submit({
            url: baseUrl,
            host: "inferenceengine.vyro.ai",
            path: `/${operation}`,
            protocol: "https:",
            headers: {
                "User-Agent": "okhttp/4.9.3",
                "Connection": "Keep-Alive",
                "Accept-Encoding": "gzip"
            }
        }, function (err, res) {
            if (err) return reject(err);
            const chunks = [];
            res.on("data", chunk => chunks.push(chunk));
            res.on("end", () => resolve(Buffer.concat(chunks)));
            res.on("error", reject);
        });
    });
}
async function isAdmin(sock, chatId, sender) {
    try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const admins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
        return admins.includes(sender.replace(/[^0-9]/g, '') + "@s.whatsapp.net");
    } catch (error) {
        console.error("⚠️ Error verificando administrador:", error);
        return false;
    }
}
function savePrefix(newPrefix) {
    global.prefix = newPrefix;
    fs.writeFileSync("./src/config.json", JSON.stringify({ prefix: newPrefix }, null, 2));
    console.log(chalk.green(`✅ Prefijo cambiado a: ${chalk.yellow.bold(newPrefix)}`));
}
async function handleDeletedMessage(sock, msg) {
    if (!global.viewonce) return;
    const chatId = msg.key.remoteJid;
    const deletedMessage = msg.message;
    if (deletedMessage) {
        await sock.sendMessage(chatId, {
            text: `⚠️ *Mensaje eliminado reenviado:*

${deletedMessage.conversation || deletedMessage.extendedTextMessage?.text || ''}`
        });
        if (deletedMessage.imageMessage) {
            const imageBuffer = await downloadMedia(deletedMessage.imageMessage, 'image');
            await sock.sendMessage(chatId, { image: imageBuffer }, { quoted: msg });
        } else if (deletedMessage.audioMessage) {
            const audioBuffer = await downloadMedia(deletedMessage.audioMessage, 'audio');
            await sock.sendMessage(chatId, { audio: audioBuffer }, { quoted: msg });
        } else if (deletedMessage.videoMessage) {
            const videoBuffer = await downloadMedia(deletedMessage.videoMessage, 'video');
            await sock.sendMessage(chatId, { video: videoBuffer }, { quoted: msg });
        }
    }
}
function loadPlugins() {
    const plugins = [];
    const pluginDir = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginDir)) return plugins;

    const walk = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (entry.name.endsWith('.js')) {
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

// Helpers compartidos con los plugins (migración desde main.js)
global.__cortana = {
    rootDir: __dirname,
    isOwner,
    isAdmin,
    downloadMedia,
    remini,
    fetchJson,
    pickRandom,
    isValidPrefix,
    saveMultimedia,
    getMultimediaList,
    isUrl,
    savePrefix,
    saveRpgData,
    imageToWebp,
    videoToWebp,
    writeExifImg,
    writeExifVid,
    writeExif,
    toAudio,
    activeSessions,
    stickersDir,
    stickersFile,
    guarFilePath,
    configFilePath,
    prefixPath,
    grupoPath,
    welcomePath,
    rpgFile,
    rutaLista,
    filePath,
    get rpgData() { return rpgData; },
    set rpgData(v) { rpgData = v; },
    get comandosRestringidos() { return comandosRestringidos; },
    set comandosRestringidos(v) { comandosRestringidos = v; }
};

// Helper global para comandos migrados que usan downloadContentFromMessage
global.downloadContentFromMessage = async (node, type) => {
    if (global.wa && typeof global.wa.downloadContentFromMessage === "function") {
        return global.wa.downloadContentFromMessage(node, type);
    }
    const m = await import('baileys');
    return m.downloadContentFromMessage(node, type);
};

const plugins = loadPlugins();

async function handleCommand(sock, msg, command, args, sender) {
    const lowerCommand = command.toLowerCase();
    const text = args.join(" ");
    global.viewonce = true;

    sock.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path)
            ? path
            : /^data:.*?\/.*?;base64,/i.test(path)
                ? Buffer.from(path.split`,`[1], 'base64')
                : /^https?:\/\//.test(path)
                    ? await (await getBuffer(path))
                    : fs.existsSync(path)
                        ? fs.readFileSync(path)
                        : Buffer.alloc(0);
        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await writeExifImg(buff, options);
        } else {
            buffer = await imageToWebp(buff);
        }
        await sock.sendMessage(jid, { sticker: { url: buffer }, ...options }, {
            quoted: quoted ? quoted : msg,
            ephemeralExpiration: 24 * 60 * 100,
            disappearingMessagesInChat: 24 * 60 * 100
        });
        return buffer;
    };

    const plugin = plugins.find(p => p.command.includes(lowerCommand));
    if (plugin) {
        return plugin(msg, {
            conn: sock,
            wa: global.wa,
            text,
            args,
            command: lowerCommand,
            usedPrefix: global.prefix,
            sender
        });
    }

    switch (lowerCommand) {
        // ✅ Los comandos fueron migrados a la carpeta plugins/
}
}




module.exports = { handleCommand };
