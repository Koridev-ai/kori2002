const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

const patron = /assertRegistrationId\s*(?:=\s*(?:async\s*)?(?:function\s*\w*\s*)?)?\([^)]*\)\s*(?:=>\s*)?\{/;

function buscarCierre(texto, inicio) {
  let nivel = 0;
  for (let i = inicio; i < texto.length; i++) {
    const c = texto[i];
    if (c === "{") nivel++;
    else if (c === "}") {
      nivel--;
      if (nivel === 0) return i;
    }
  }
  return -1;
}

function rutasValidador() {
  const raiz = path.resolve(__dirname, "..");
  return [
    path.join(raiz, "node_modules", "libsignal", "lib", "prekey-bundle-validator.js"),
    path.join(raiz, "node_modules", "baileys", "node_modules", "libsignal", "lib", "prekey-bundle-validator.js"),
  ];
}

function parchearArchivo(archivo) {
  const original = fs.readFileSync(archivo, "utf-8");
  const m = patron.exec(original);
  if (!m) return "desconocido";
  const abre = m.index + m[0].length - 1;
  const cierra = buscarCierre(original, abre);
  if (cierra === -1) return "desconocido";
  if (original.slice(abre + 1, cierra).trim() === "") return "listo";
  const respaldo = archivo + ".orig";
  if (!fs.existsSync(respaldo)) fs.writeFileSync(respaldo, original);
  fs.writeFileSync(archivo, original.slice(0, abre + 1) + original.slice(cierra));
  return "parcheado";
}

function aplicarParche() {
  for (const archivo of rutasValidador()) {
    if (!fs.existsSync(archivo)) continue;
    try {
      const estado = parchearArchivo(archivo);
      if (estado === "parcheado") {
        console.log(chalk.green("🩹 libsignal: validación de registrationId desactivada para aceptar IDs de 32 bits."));
      } else if (estado === "desconocido") {
        console.log(chalk.yellow("⚠️ libsignal: no se reconoció assertRegistrationId, el parche no se aplicó."));
      }
    } catch (e) {
      console.log(chalk.yellow(`⚠️ libsignal: no se pudo aplicar el parche (${e.message}).`));
    }
  }
}

module.exports = aplicarParche;

if (require.main === module) aplicarParche();
