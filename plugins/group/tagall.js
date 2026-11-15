"use strict";

const gk = require("../../libs/groupkit");
const kit = require("../../libs/pluginkit");
const pdb = require("../../libs/profiledb");

const COUNTRIES = {
  "1": "Estados Unidos/Canadá",
  "7": "Rusia",
  "20": "Egipto",
  "27": "Sudáfrica",
  "30": "Grecia",
  "31": "Países Bajos",
  "32": "Bélgica",
  "33": "Francia",
  "34": "España",
  "36": "Hungría",
  "39": "Italia",
  "40": "Rumanía",
  "41": "Suiza",
  "43": "Austria",
  "44": "Reino Unido",
  "45": "Dinamarca",
  "46": "Suecia",
  "47": "Noruega",
  "48": "Polonia",
  "49": "Alemania",
  "51": "Perú",
  "52": "México",
  "53": "Cuba",
  "54": "Argentina",
  "55": "Brasil",
  "56": "Chile",
  "57": "Colombia",
  "58": "Venezuela",
  "60": "Malasia",
  "61": "Australia",
  "62": "Indonesia",
  "63": "Filipinas",
  "64": "Nueva Zelanda",
  "65": "Singapur",
  "66": "Tailandia",
  "81": "Japón",
  "82": "Corea del Sur",
  "84": "Vietnam",
  "86": "China",
  "90": "Turquía",
  "91": "India",
  "92": "Pakistán",
  "94": "Sri Lanka",
  "98": "Irán",
  "212": "Marruecos",
  "213": "Argelia",
  "216": "Túnez",
  "218": "Libia",
  "234": "Nigeria",
  "237": "Camerún",
  "254": "Kenia",
  "255": "Tanzania",
  "351": "Portugal",
  "353": "Irlanda",
  "380": "Ucrania",
  "385": "Croacia",
  "502": "Guatemala",
  "503": "El Salvador",
  "504": "Honduras",
  "505": "Nicaragua",
  "506": "Costa Rica",
  "507": "Panamá",
  "591": "Bolivia",
  "593": "Ecuador",
  "595": "Paraguay",
  "598": "Uruguay",
  "966": "Arabia Saudita",
  "971": "Emiratos Árabes",
  "972": "Israel",
  "974": "Catar"
};

function countryOf(digits) {
  for (let l = Math.min(digits.length, 4); l >= 1; l--) {
    if (COUNTRIES[digits.slice(0, l)]) return COUNTRIES[digits.slice(0, l)];
  }
  return "país desconocido";
}

module.exports = gk.define({
  commands: ["todos", "invocar", "tagall"],
  description: "Enviar un mensaje mencionando a todos los usuarios del grupo.",
  admin: true,
  run: async ({ sock, msg, g, args } ) => {
    const prefixArg = args.find((a) => /^\+\d{1,4}$/.test(a));
    const reason = args.filter((a) => a !== prefixArg).join(" ");
    const sender = pdb.selfJid(msg);
    let members = g.participants.map((p) => p.id).filter(Boolean);
    let countryLine = "";
    if (prefixArg) {
      const digits = prefixArg.replace("+", "");
      members = members.filter((jid) => gk.mention(jid).slice(1).startsWith(digits));
      if (!members.length) {
        return kit.reply(sock, msg, `《✧》 No hay miembros con el prefijo *+${digits}* (${countryOf(digits)}) en este grupo.`);
      }
      countryLine = `❖ \`País :\` ${countryOf(digits)}\n`;
    }
    let text = `﹒⌗﹒ ✦ .ৎ˚₊‧  ${reason || "Revivan"}\n\n𐚁 ֹ ִ \`GROUP TAG\` ! ୧ ֹ ִ\n\n✧ \`Miembros :\` ${members.length}\n${countryLine}❖ \`Solicitado por :\` ${gk.mention(sender)}\n\n╭┄ ꒰ \`Lista de usuarios:ׄ\` ꒱ ┄\n`;
    for (const jid of members) text += `┊ꕥ ${gk.mention(jid)}\n`;
    text += "╰⸼ ┄ ┄ ꒰ `✦` ꒱ ┄ ┄⸼";
    return kit.reply(sock, msg, text, { mentions: [sender, ...members] });
  }
});
