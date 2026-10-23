<h1 align="center">🪼 CORTANA 2.0 BOT 🪼</h1>

<p align="center">
  <img src="https://cdn.russellxz.click/8d278a49.jpeg" width="600" alt="Cortana 2.0 Bot"/>
</p>

<p align="center">
  <strong>Una inteligencia artificial poderosa, moderna y alojada en <a href="https://paymenter.skyultraplus.com">Sky Ultra Plus</a>.</strong><br>
  Automatiza, responde, juega y mucho más... ¡Con estilo futurista!
</p>

<p align="center">
  <a href="https://dash.skyultraplus.com">
    <img src="https://cdn.dorratz.com/files/1742239358886.jpg" height="80" alt="Sky Ultra Plus Hosting">
  </a>
</p>

<p align="center">
  <a href="https://dash.skyultraplus.com">
    <img src="https://img.shields.io/badge/💻 Hosting%20en%20SkyUltraPlus-blue?style=for-the-badge" />
  </a>
  <a href="https://youtu.be/xH_gQrqw4HI?si=9TUc5o6nJmT8JpVo">
    <img src="https://img.shields.io/badge/🎬 Ver%20tutorial-red?style=for-the-badge" />
  </a>
  <a href="https://chat.whatsapp.com/EB4vMpRUw8R6me7myYF53M">
    <img src="https://img.shields.io/badge/💬 Comunidad%20Cortana-green?style=for-the-badge" />
  </a>
  <a href="https://chat.whatsapp.com/E6iWpvGuJ8zJNPbN3zOr0D">
    <img src="https://img.shields.io/badge/🌐 Comunidad%20SkyUltraPlus-purple?style=for-the-badge" />
  </a>
</p>

---

## 🌟 ¿Qué es Cortana 2.0 Bot?

Cortana 2.0 Bot es un **bot inteligente para WhatsApp** basado en la última tecnología de interacción.  
Con una estética única inspirada en Halo y funciones premium, es la evolución de Azura Ultra, mejorada y más veloz.

> 🚀 **Funciones**:
- Comandos personalizados
- Juegos interactivos como Verdad o Reto
- Generador de Stickers, Menús animados y mucho más
- Gestión de grupos, sistemas de niveles, economía, plugins...

---

## 📦 Alojado en:

**🖥 Sky Ultra Plus**  
Hosting veloz, seguro, y con panel de control intuitivo.  
Tu bot merecía lo mejor, y aquí está:

👉 **[¡Ir a Sky Ultra Plus!](https://paymenter.skyultraplus.com)**

---

## 🎬 Video tutorial

Aprende a instalar y configurar Cortana en menos de 10 minutos:  
📺 **[Ver en YouTube](https://youtu.be/xH_gQrqw4HI?si=9TUc5o6nJmT8JpVo)**

---

## 📱 Instalación en Termux (Android)

Cortana 2.0 funciona en Termux con **Node.js 20 o superior**. Se recomienda Android **ARM64** (la mayoría de teléfonos actuales), ya que `@napi-rs/canvas` incluye un binario precompilado para `android-arm64`.

### Instalación automática

```bash
pkg update -y && pkg upgrade -y
```
```bash
pkg install -y git
```
```bash
git clone https://github.com/Koridev-ai/kori2002.git kori2002
```
```bash
cd kori2002
```
```bash
bash termux-install.sh
```
```bash
npm start
```

> Si ya tienes el proyecto copiado en Termux, solo entra a la carpeta y ejecuta `bash termux-install.sh`.

### Instalación manual

```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs-lts npm git python ffmpeg libwebp
cd ~/cortana
npm install
npm start
```

> En versiones recientes de Termux, `npm` ya no viene incluido con `nodejs-lts`; instálalo aparte con `pkg install npm`.

### Notas para Termux

- **Node.js:** usa `nodejs-lts` (Node 20 o superior; actualmente 24 LTS). Comprueba con `node -v`.
- **Sin compilación nativa:** el proyecto usa `@napi-rs/canvas` (binario precompilado para Android ARM64) y `jimp` (JavaScript puro). No necesita `canvas`, `sharp`, Cairo, Pango ni el NDK de Android.
- **npm:** el archivo `.npmrc` incluye `legacy-peer-deps=true` para que npm no intente instalar `sharp` (peer opcional de Baileys) en Android.
- **ffmpeg:** necesario para stickers, conversiones de audio/vídeo y miniaturas. Se instala con `pkg install ffmpeg`.
- **python:** necesario para `speed.py`.
- **git:** necesario para los comandos que actualizan el bot (`.carga`, `.git`).
- **Carpetas:** el bot crea automáticamente `sessions/` y `tmp/`. No ejecutes el bot desde `/sdcard`; usa la carpeta home de Termux (`~/cortana`).
- **Segundo plano:** para evitar que Android suspenda el bot, puedes usar:
  ```bash
  termux-wake-lock
  npm start
  ```
  Y para detenerlo: `termux-wake-unlock`.

---

## 👑 Creador y Colaboradores

💻 **𝐃𝐞𝐬𝐚𝐫𝐫𝐨𝐥𝐥𝐚𝐝𝐨𝐫 𝐩𝐫𝐢𝐧𝐜𝐢𝐩𝐚𝐥:**  
- 👑 **Russell XZ** — *Creador de Azura Ultra y fundador de Sky Ultra Plus*

🤖 **𝐂𝐨𝐥𝐚𝐛𝐨𝐫𝐚𝐝𝐨𝐫𝐞𝐬:**  
- 🔹 [DIEGO-OFC](https://github.com/DIEGO-OFC)  
- 🔹 [Eliasar54](https://github.com/Eliasar54)

📢 ¡Gracias por apoyar el desarrollo de este poderoso bot!

---

## 💬 Comunidades

Únete a nuestras comunidades y entérate de las actualizaciones, soporte y novedades:

- 🤖 [Comunidad Cortana](https://chat.whatsapp.com/EB4vMpRUw8R6me7myYF53M)  
- ☁️ [Comunidad Sky Ultra Plus](https://chat.whatsapp.com/E6iWpvGuJ8zJNPbN3zOr0D)

---

<p align="center">
  <b>✨ Cortana 2.0 Bot — El futuro de los bots de WhatsApp empieza aquí. ✨</b>
</p>
