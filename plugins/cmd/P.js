// plugins/p.js
// Comando: .p
// Muestra capacidad y uso del servidor (RAM, CPU, TODOS los discos, uptime).
// Reacciona al usar el comando y responde citando el mensaje original.
// Nota: el bot está alojado en "Sky Ultra Plus" (informativo).

const os = require("os");
const fs = require("fs");

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "—";
  const gb = bytes / (1024 ** 3);
  return `${gb.toFixed(2)} GB`;
}
function pct(used, total) {
  if (!total) return "—";
  return `${((used / total) * 100).toFixed(1)}%`;
}
function num(n) {
  return Number(n || 0).toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

// Aproximación de % CPU usando muestreo corto
function sampleCpuPercent(ms = 400) {
  return new Promise((resolve) => {
    const snap = () => os.cpus().map(c => c.times);
    const a = snap();
    setTimeout(() => {
      const b = snap();
      let idle = 0, total = 0;
      for (let i = 0; i < a.length; i++) {
        const at = a[i], bt = b[i];
        const idleDelta = bt.idle - at.idle;
        const totalDelta =
          (bt.user - at.user) +
          (bt.nice - at.nice) +
          (bt.sys - at.sys) +
          (bt.irq - at.irq) +
          idleDelta;
        idle += idleDelta;
        total += totalDelta;
      }
      const usage = total > 0 ? (1 - idle / total) * 100 : 0;
      resolve(Math.max(0, Math.min(100, usage)));
    }, ms);
  });
}

// Info de discos usando la API de Node (funciona en Termux/Android y Windows)
function getDisksInfo() {
  const candidates = ["/", os.homedir(), process.env.PREFIX, process.cwd()].filter(Boolean);
  const seenDevices = new Set();
  const disks = [];

  for (const mount of candidates) {
    try {
      const stat = fs.statSync(mount);
      if (seenDevices.has(stat.dev)) continue;
      seenDevices.add(stat.dev);

      const s = fs.statfsSync(mount);
      const total = s.blocks * s.bsize;
      const avail = s.bavail * s.bsize;
      const used = total - s.bfree * s.bsize;

      disks.push({
        fs: mount,
        mount,
        total,
        used,
        avail,
        usedPct: total ? `${((used / total) * 100).toFixed(1)}%` : null,
      });
    } catch {}
  }

  return Promise.resolve(disks);
}

module.exports = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;

  // Reacción inicial
  await conn.sendMessage(chatId, { react: { text: "🛰️", key: msg.key } });

  // RAM
  const totalMem = os.totalmem();
  const freeMem  = os.freemem();
  const usedMem  = totalMem - freeMem;

  // CPU (modelo y núcleos)
  const cpus = os.cpus() || [];
  const cpuModel = cpus[0]?.model || "Desconocido";
  const cpuCores = cpus.length;

  // Carga promedio (1, 5, 15 min)
  const [l1, l5, l15] = os.loadavg();

  // % CPU (muestreo corto)
  const cpuPercent = await sampleCpuPercent(400);

  // Discos (TODOS)
  const disks = await getDisksInfo();

  // Uptime
  const upSec = os.uptime();
  const d = Math.floor(upSec / 86400);
  const h = Math.floor((upSec % 86400) / 3600);
  const m = Math.floor((upSec % 3600) / 60);
  const s = Math.floor(upSec % 60);
  const uptimeStr = `${d}d ${h}h ${m}m ${s}s`;

  // Host
  const host = os.hostname();
  const platform = `${os.platform()} ${os.release()}`;
  const nodev = process.version;

  // Armado de texto base
  let texto =
`🖥️ *Estado del Servidor* (Sky Ultra Plus)
🏷️ Host: *${host}*
🧩 SO: *${platform}*
🟢 Uptime: *${uptimeStr}*
────────────────
🧠 *RAM*
• Total: ${formatBytes(totalMem)}
• Usada: ${formatBytes(usedMem)}  (${pct(usedMem, totalMem)})
• Libre: ${formatBytes(freeMem)}
────────────────
⚙️ *CPU*
• Modelo: ${cpuModel}
• Núcleos: ${cpuCores}
• Carga (1/5/15m): ${num(l1)} / ${num(l5)} / ${num(l15)}
• Uso aprox.: ${num(cpuPercent)}%
────────────────
💾 *Discos (df)*`;

  if (disks.length > 0) {
    for (const dsk of disks) {
      const t = dsk.total;
      const u = dsk.used;
      const a = dsk.avail;
      const p = dsk.usedPct || pct(u, t);

      texto += `\n• *${dsk.mount}* (${dsk.fs})
  - Capacidad: ${formatBytes(t)}
  - Usado: ${formatBytes(u)}  (${p})
  - Libre: ${formatBytes(a)}`;
    }
  } else {
    texto += `\n• No disponible (sin 'df' o sin datos)`;
  }

  texto += `\n────────────────
🔧 Node.js: ${nodev}`;

  // Enviar citando SIEMPRE el mensaje original
  await conn.sendMessage(chatId, { text: texto, quoted: msg });

  // Reacción final
  await conn.sendMessage(chatId, { react: { text: "✅", key: msg.key } });
};

module.exports.command = ["p"];
