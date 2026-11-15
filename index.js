const chalk = require("chalk");
const yargs = require("yargs/yargs");
const os = require("os");
const path = require("path");
const { join } = path;
const figlet = require("figlet");
const fs = require("fs");
const { readdirSync, statSync, unlinkSync } = fs;
const readline = require("readline");
const pino = require("pino");
const qrcodeTerminal = require("qrcode-terminal");

process.chdir(__dirname);

require("./config");
require("./main");
const botconf = require("./libs/botconf");
const dispatch = require("./libs/dispatch");
const subbot = require("./libs/subbot");

const mainBot = { id: null, isMain: true, bootTime: Date.now() };
let mainNumber = "";
let subsStarted = false;

const startSubs = () => {
  if (subsStarted) return;
  subsStarted = true;
  subbot.start();
};

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
const localTmpDir = join(__dirname, "./tmp");
if (!fs.existsSync(localTmpDir)) fs.mkdirSync(localTmpDir, { recursive: true });

async function clearTmp() {
  const filenames = [];
  [os.tmpdir(), localTmpDir].forEach((dirname) => {
    try {
      readdirSync(dirname).forEach((file) => filenames.push(join(dirname, file)));
    } catch {}
  });
  return filenames.map((file) => {
    try {
      const stats = statSync(file);
      if (stats.isFile() && Date.now() - stats.mtimeMs >= 1000 * 60) return unlinkSync(file);
    } catch {}
    return false;
  });
}

if (!opts["test"]) {
  setInterval(() => {
    if (opts["autocleartmp"]) clearTmp().catch((e) => console.error(e));
  }, 60 * 1000);
}

setInterval(async () => {
  await clearTmp();
  console.log(chalk.cyanBright("╭━─━─━─≪🔆≫─━─━─━╮\n│SE LIMPIO LA CARPETA TMP CORRECTAMENTE\n╰━─━─━─≪🔆≫─━─━─━╯"));
}, 1000 * 60 * 60);

(async () => {
  const wa = await import("baileys");
  const {
    makeResilientSocket,
    Browsers,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    downloadContentFromMessage,
    DisconnectReason,
    formatPairingCode,
    isRateLimitError,
  } = wa;

  global.wa = wa;
  global.downloadContentFromMessage = downloadContentFromMessage;

  const { state, saveCreds } = await useMultiFileAuthState("./sessions");

  console.log(chalk.cyan(figlet.textSync("Cortana ultra 2.0", { font: "Standard" })));
  console.log(chalk.green("\n✅ Iniciando conexión...\n"));
  console.log(chalk.yellow("📡 ¿Cómo deseas conectarte?\n"));
  console.log(chalk.green("  [1] ") + chalk.white("📷 Escanear código QR"));
  console.log(chalk.green("  [2] ") + chalk.white("🔑 Ingresar código de 8 dígitos\n"));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (text) => new Promise((resolve) => rl.question(text, resolve));

  let method = "1";
  let phoneNumber = "";
  if (!fs.existsSync("./sessions/creds.json")) {
    method = (await question(chalk.magenta("Elige una opción (1 = QR, 2 = código): "))).trim();
    if (!["1", "2"].includes(method)) {
      console.log(chalk.red("\n❌ Opción inválida. Reinicia el bot y elige 1 o 2."));
      process.exit(1);
    }
    if (method === "2") {
      phoneNumber = (await question(chalk.magenta("📞 Ingresa tu número (Ej: 5491168XXXX): "))).replace(/\D/g, "");
    }
  }

  let pairingRequested = false;

  const silentLogger = pino({ level: "silent" });
  const errorLogger = pino({ level: "error" });
  let processHandlersSet = false;

  const socketConfig = {
    logger: errorLogger,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, silentLogger) },
    browser: method === "1" ? Browsers.macOS("Safari") : Browsers.ubuntu("Chrome"),
    syncFullHistory: false,
  };

  function bindSocket(sock) {
    try {
      global.mainSock = sock;
      sock.ev.on("messages.upsert", (messageUpsert) => {
        dispatch.onUpsert(sock, messageUpsert, mainBot).catch((error) => console.error("❌ Error en messages.upsert:", error));
      });

      sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update;

        if (qr && !state.creds.registered) {
          if (method === "1") {
            console.log(chalk.yellow("\n📷 Escanea este código QR con WhatsApp:\n"));
            qrcodeTerminal.generate(qr, { small: true });
          } else if (method === "2" && !pairingRequested && phoneNumber) {
            pairingRequested = true;
            try {
              const code = await sock.requestPairingCode(phoneNumber);
              console.log(chalk.magenta("🔑 Código de vinculación: ") + chalk.yellow(formatPairingCode(code)));
            } catch (error) {
              pairingRequested = false;
              if (isRateLimitError(error)) {
                console.error(chalk.red("⏳ WhatsApp limitó los códigos de vinculación. Espera unos minutos e inténtalo de nuevo."));
              } else {
                console.error("❌ Error solicitando el código de vinculación:", error);
              }
            }
          }
        }

        if (connection === "connecting") {
          console.log(chalk.blue("🔄 Conectando a WhatsApp..."));
        } else if (connection === "open") {
          console.log(chalk.green("✅ ¡Conexión establecida con éxito!"));
          mainNumber = botconf.number(sock.user?.id);
          mainBot.id = mainNumber;
          mainBot.bootTime = Date.now();
          botconf.get(mainNumber);
          botconf.set(mainNumber, "type", "Owner");
          botconf.register(mainNumber, { isMain: true, getSock: () => global.mainSock });
          botconf.setOnline(mainNumber, true);
          startSubs();
          const restarterFile = "./src/lastRestarter.json";
          if (fs.existsSync(restarterFile)) {
            try {
              const data = JSON.parse(fs.readFileSync(restarterFile, "utf-8"));
              if (data.chatId) {
                await sock.sendMessage(data.chatId, { text: "✅ *El bot está en línea nuevamente tras el reinicio.* 🚀" });
                console.log(chalk.green("📢 Notificación enviada al chat del reinicio."));
                fs.unlinkSync(restarterFile);
              }
            } catch (error) {
              console.error("❌ Error al procesar lastRestarter.json:", error);
            }
          }
        } else if (connection === "close") {
          if (mainNumber) botconf.setOnline(mainNumber, false);
          if (!state.creds.registered) pairingRequested = false;
          console.log(chalk.red("❌ Conexión cerrada. BaileysX gestionará la reconexión..."));
        }
      });

      sock.ev.on("group-participants.update", (update) => dispatch.onParticipants(sock, update, mainBot).catch(() => null));

      sock.ev.on("creds.update", saveCreds);

      if (!processHandlersSet) {
        processHandlersSet = true;
        process.on("uncaughtException", (err) => console.error(chalk.red("⚠️ Error no manejado:"), err));
        process.on("unhandledRejection", (reason, promise) => console.error(chalk.red("🚨 Promesa rechazada sin manejar:"), promise, "razón:", reason));
      }
    } catch (error) {
      console.error(chalk.red("❌ Error enlazando el socket:"), error);
    }
  }

  if (fs.existsSync("./sessions/creds.json")) setTimeout(startSubs, 10000);

  makeResilientSocket({
    config: socketConfig,
    logger: errorLogger,
    minDelayMs: 2000,
    maxDelayMs: 60000,
    shouldReconnect: (statusCode) => statusCode !== DisconnectReason.loggedOut,
    onSocket: (sock) => { bindSocket(sock); },
    onStopped: (statusCode) => {
      if (statusCode === DisconnectReason.loggedOut) {
        console.log(chalk.red("❌ Sesión cerrada. Elimina la carpeta ./sessions y vuelve a iniciar para vincular de nuevo."));
      } else {
        console.log(chalk.red(`❌ BaileysX detuvo la reconexión (código ${statusCode}). Revisa la sesión y reinicia el bot.`));
      }
    },
    onMaxAttemptsReached: () => console.log(chalk.red("❌ Se alcanzó el máximo de intentos de reconexión.")),
  });
})();
