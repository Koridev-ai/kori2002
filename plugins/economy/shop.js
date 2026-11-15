"use strict";

const kit = require("../../libs/pluginkit");
const eco = require("../../libs/ecokit");
const pdb = require("../../libs/profiledb");

const WEAPONS = [
  { id: "espada", name: "Espada", price: 8000, durability: 100, description: "Para aventura", type: "Combate" },
  { id: "hacha", name: "Hacha", price: 7500, durability: 100, description: "Para mazmorra", type: "Combate" },
  { id: "arco", name: "Arco", price: 7000, durability: 100, description: "Para cazar", type: "Combate" }
];

const TOOLS = [
  { id: "pico", name: "Pico", price: 6500, durability: 100, description: "Para minar", type: "Equipo" },
  { id: "caña", name: "Caña de pescar", price: 6000, durability: 100, description: "Para pescar", type: "Equipo" },
  { id: "totem", name: "Totem", price: 4000, durability: 3, description: "Para ritual", type: "Consumible" },
  { id: "pocion", name: "Pocion", price: 1500, durability: 1, description: "Restaura magia", type: "Consumible" }
];

const ALL = [...WEAPONS, ...TOOLS];
const isWeapon = (item) => WEAPONS.some((w) => w.id === item.id);
const isConsumable = (item) => item.id === "totem" || item.id === "pocion";

function owns(me, item) {
  if (isWeapon(item)) return !!me.weapons[item.id];
  if (isConsumable(item)) return false;
  return !!me.tools[item.id];
}

function grant(me, item) {
  if (isWeapon(item)) me.weapons[item.id] = { durability: item.durability, maxDurability: item.durability };
  else if (isConsumable(item)) me.inventory[item.id] = (me.inventory[item.id] || 0) + 1;
  else me.tools[item.id] = { durability: item.durability, maxDurability: item.durability };
}

module.exports = eco.define({
  commands: ["shop", "tienda", "buy", "comprar", "inventory", "inv", "inventario"],
  description: "Ver la tienda del bot.",
  run: async ({ sock, msg, jid, me, args, usedPrefix, command }) => {
    const currency = eco.currency();
    const cmd = command.toLowerCase();

    if (["inventory", "inv", "inventario"].includes(cmd)) {
      const name = pdb.peek(jid)?.name || msg.pushName || "Usuario";
      let text = `*「✿」Inventario* ◢ ${name} ◤\n`;
      text += `⛁ Coins totales › *${eco.money(me.coins + me.bank)}*\n`;
      text += `♡ Salud › *${me.health}/100*\n♛ Stamina › *${me.stamina}/100*\n⸙ Magia › *${me.magic}/100*\n`;
      let has = false;
      const weapons = Object.entries(me.weapons).filter(([id]) => WEAPONS.some((w) => w.id === id));
      if (weapons.length) {
        has = true;
        text += `\nꕥ Armas › *${weapons.length}*`;
        for (const [id, w] of weapons) text += `\n○ ${WEAPONS.find((x) => x.id === id).name} › *${w.durability}/${w.maxDurability || 100}*`;
      }
      const tools = Object.entries(me.tools).filter(([id]) => TOOLS.some((t) => t.id === id));
      if (tools.length) {
        has = true;
        text += `\n\n𖢺 Equipo › *${tools.length}*`;
        for (const [id, t] of tools) text += `\n○ ${TOOLS.find((x) => x.id === id).name} › *${t.durability}/${t.maxDurability || 100}*`;
      }
      if ((me.inventory.totem || 0) > 0 || (me.inventory.pocion || 0) > 0) {
        has = true;
        text += "\n\n𖣺 Consumibles";
        if (me.inventory.totem > 0) text += `\n○ Totem › *${me.inventory.totem}*`;
        if (me.inventory.pocion > 0) text += `\n○ Pocion › *${me.inventory.pocion}*`;
      }
      if (!has) text += `\n\nTu inventario está vacío.\nCompra items en la tienda usando: *${usedPrefix}shop*`;
      return kit.reply(sock, msg, text);
    }

    if (cmd === "shop" || cmd === "tienda") {
      const available = ALL.filter((item) => isConsumable(item) || !owns(me, item));
      if (!available.length) {
        return kit.reply(sock, msg, "*☆ Item Shop `≧◠ᴥ◠≦`*\n\nꕥ En estos momentos la tienda está cerrada por reabastecimiento.\n\n> ꕥ Has comprado todos los objetos disponibles.");
      }
      const page = parseInt(args[0], 10) || 1;
      const size = 10;
      const pages = Math.ceil(available.length / size);
      if (page < 1 || page > pages) return kit.reply(sock, msg, `ꕥ Página inválida. Solo hay *${pages}* disponible${pages > 1 ? "s" : ""}.`);
      const list = available.slice((page - 1) * size, page * size).map((item) => {
        let description = item.description;
        if (item.id === "pocion") {
          const missing = 100 - me.magic;
          description = missing > 0 ? `Restaura ${missing} puntos de magia (${missing}/100)` : "Poción mágica";
        }
        const durability = item.type === "Consumible" ? `ⴵ Usos » *${item.durability}*` : `ⴵ Durabilidad » *${item.durability}*`;
        return `❀ *${item.name}* (${item.type}):\n> ⛁ Precio » *¥${item.price.toLocaleString()} ${currency}*\n> ❖ Descripcion » *${description}*\n> ${durability}`;
      });
      return kit.reply(sock, msg, `*☆ Item Shop \`≧◠ᴥ◠≦\`*\n❏ Objetos disponibles <${available.length}>:\n\n${list.join("\n\n")}\n\n> • Paginá *${page}* de *${pages}*`);
    }

    if (!args.length) {
      return kit.reply(sock, msg, `ꕥ Especifica qué quieres comprar.\n> ✐ Ejemplo: *${usedPrefix}buy* espada\n> ✐ Ver tienda: *${usedPrefix}shop*`);
    }

    if (args[0].toLowerCase() === "all") {
      const items = ALL.filter((item) => !owns(me, item));
      if (!items.length) return kit.reply(sock, msg, "ꕥ Ya tienes todos los items disponibles.");
      const total = items.reduce((acc, item) => acc + item.price, 0);
      if (me.coins < total) {
        return kit.reply(sock, msg, `ꕥ No tienes suficientes ${currency} para comprar todo.\n⛁ Necesitas: *¥${total.toLocaleString()}*\n⛁ Tienes: *¥${me.coins.toLocaleString()}*`);
      }
      for (const item of items) grant(me, item);
      me.coins -= total;
      eco.save();
      return kit.reply(sock, msg, `ꕥ Has comprado todos los items disponibles (${items.length} items) por *¥${total.toLocaleString()} ${currency}*.`);
    }

    const inputs = args.join(" ").split(",").map((i) => i.trim().toLowerCase()).filter(Boolean);
    const toBuy = [];
    const notFound = [];
    const alreadyHave = [];
    for (const input of inputs) {
      let item = ALL.find((i) => i.id === input);
      if (!item) {
        const num = parseInt(input, 10);
        if (num >= 1 && num <= ALL.length) item = ALL[num - 1];
      }
      if (!item) {
        notFound.push(input);
        continue;
      }
      if (owns(me, item) || toBuy.includes(item) && !isConsumable(item)) {
        alreadyHave.push(item.name);
        continue;
      }
      toBuy.push(item);
    }
    if (!toBuy.length) {
      let text = "ꕥ No se pudo comprar ningún item.";
      if (notFound.length) text += `\n> Items no encontrados: *${notFound.join(", ")}*`;
      if (alreadyHave.length) text += `\n> Ya tienes: *${alreadyHave.join(", ")}*`;
      return kit.reply(sock, msg, text);
    }
    const total = toBuy.reduce((acc, item) => acc + item.price, 0);
    if (me.coins < total) {
      return kit.reply(sock, msg, `ꕥ No tienes suficientes ${currency}.\n⛁ Necesitas: *¥${total.toLocaleString()}*\n⛁ Tienes: *¥${me.coins.toLocaleString()}*`);
    }
    for (const item of toBuy) grant(me, item);
    me.coins -= total;
    eco.save();
    let text = `ꕥ Compra exitosa:\n> Items: *${toBuy.map((i) => i.name).join(", ")}*\n> Total: *¥${total.toLocaleString()} ${currency}*`;
    if (notFound.length || alreadyHave.length) {
      text += "\n\n> Notas:";
      if (notFound.length) text += `\n> • Items no encontrados: *${notFound.join(", ")}*`;
      if (alreadyHave.length) text += `\n> • Ya tienes: *${alreadyHave.join(", ")}*`;
    }
    return kit.reply(sock, msg, text);
  }
});
