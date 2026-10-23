"use strict";

const os = require('os');
const fs = require('fs');

const handler = async (msg, _ctx = {}) => {
  const sock = _ctx.conn;
  const text = _ctx.text;
  const args = _ctx.args;
  const sender = _ctx.sender;
  const command = _ctx.command;
  const usedPrefix = _ctx.usedPrefix;


  {

    try {
        const start = Date.now(); // Marca de inicio para calcular el ping
        const now = new Date();
        const options = { 
            weekday: "long", 
            year: "numeric", 
            month: "long", 
            day: "numeric", 
            hour: "2-digit", 
            minute: "2-digit", 
            second: "2-digit", 
            timeZoneName: "short" 
        };
        const formattedDate = now.toLocaleDateString("es-ES", options);

        const uptime = os.uptime();
        const uptimeDays = Math.floor(uptime / 86400);
        const uptimeHours = Math.floor((uptime % 86400) / 3600);
        const uptimeMinutes = Math.floor((uptime % 3600) / 60);
        const uptimeSeconds = Math.floor(uptime % 60);
        const uptimeFormatted = `${uptimeDays} días, ${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`;

        const freeMem = os.freemem();
        const totalMem = os.totalmem();
        const usedMem = totalMem - freeMem;
        const freeMemGB = (freeMem / 1024 / 1024 / 1024).toFixed(2);
        const totalMemGB = (totalMem / 1024 / 1024 / 1024).toFixed(2);
        const usedMemGB = (usedMem / 1024 / 1024 / 1024).toFixed(2);

        const cpuModel = os.cpus()[0].model;
        const numCores = os.cpus().length;
        const loadAvg = os.loadavg()[0].toFixed(2);
        let diskUsage = "No disponible";
        try {
            const s = fs.statfsSync(os.homedir());
            const total = s.blocks * s.bsize;
            const free = s.bavail * s.bsize;
            const used = total - s.bfree * s.bsize;
            const gb = (n) => (n / 1024 / 1024 / 1024).toFixed(2);
            diskUsage = `${gb(used)} GB / ${gb(total)} GB`;
        } catch {}

        await sock.sendMessage(msg.key.remoteJid, {
            react: {
                text: "🏓",
                key: msg.key
            }
        });

        const ping = Date.now() - start; // Cálculo de ping real

        await sock.sendMessage(msg.key.remoteJid, {
            image: { url: "https://cdn.russellxz.click/97dd9288.jpeg" }, 
            caption: `🏓 *Ping! El bot está activo.*\n\n` +
                     `📶 *Ping Real:* ${ping} ms\n` +
                     `📅 *Fecha y hora actual:* ${formattedDate}\n\n` +
                     `🕒 *Tiempo Activo:* ${uptimeFormatted}\n\n` +
                     `💻 *Información del Servidor:*\n` +
                     `🔹 *CPU:* ${cpuModel}\n` +
                     `🔹 *Núcleos:* ${numCores}\n` +
                     `🔹 *Carga del sistema:* ${loadAvg}\n\n` +
                     `🖥️ *Memoria RAM:*\n` +
                     `🔹 *Usada:* ${usedMemGB}GB\n` +
                     `🔹 *Libre:* ${freeMemGB}GB\n` +
                     `🔹 *Total:* ${totalMemGB}GB\n\n` +
                     `💾 *Disco:* ${diskUsage}\n\n` +
                     `🌐 *Alojado en:* *Sky Ultra Plus* 🚀\n` +
                     `📌 *Proveedor de Hosting de Confianza*`,
            quoted: msg
        });

    } catch (error) {
        console.error("❌ Error en el comando ping:", error);
        await sock.sendMessage(msg.key.remoteJid, {
            text: "❌ *Error al obtener información del servidor.*",
            quoted: msg
        });
    }
    return;
            

  }
};

handler.command = ['pong'];
module.exports = handler;
