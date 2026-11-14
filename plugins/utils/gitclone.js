"use strict";

const fetch = require("node-fetch");
const kit = require("../../libs/pluginkit");

const REPO_REGEX = /^(?:https:\/\/|git@)github\.com[\/:]([^\/]+)\/([^\/]+?)(?:\.git)?\/?$/i;
const GITHUB_HEADERS = { "User-Agent": "Mozilla/5.0", Accept: "application/vnd.github+json" };

function formatDate(value, locale = "es") {
  const d = new Date(value);
  return d.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  });
}

async function fetchZip(owner, name) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/zipball`, { headers: GITHUB_HEADERS });
  if (!res.ok) throw new Error(`GitHub respondió ${res.status} al descargar el zip`);
  const disposition = res.headers.get("content-disposition")?.match(/filename=(.*)/)?.[1];
  const zipName = (disposition || `${name}-${owner}.zip`).replace(/["']/g, "");
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, zipName };
}

async function fetchAvatar(url) {
  const res = await fetch(url, { headers: GITHUB_HEADERS });
  return Buffer.from(await res.arrayBuffer());
}

const handler = async (msg, ctx = {}) => {
  const sock = ctx.conn;
  const chatId = msg.key.remoteJid;
  const usedPrefix = ctx.usedPrefix || global.prefix || ".";
  const command = ctx.command || "gitclone";
  const text = (ctx.args || []).join(" ").trim();

  if (!text) {
    return kit.reply(sock, msg, "《✧》 Por favor, proporciona un enlace o nombre del repositorio de GitHub.");
  }

  try {
    await kit.react(sock, msg, "🕒");
    let repos = [];
    let image;
    let zip = null;

    const match = text.match(REPO_REGEX);
    if (match) {
      const [, user, repo] = match;
      const repoRes = await fetch(`https://api.github.com/repos/${user}/${repo}`, { headers: GITHUB_HEADERS });
      const repoData = await repoRes.json();
      if (!repoRes.ok || !repoData?.owner) {
        await kit.react(sock, msg, "✖️");
        return kit.reply(sock, msg, "《✧》 No se encontraron resultados.");
      }
      zip = await fetchZip(user, repo);
      repos.push(repoData);
      image = await fetchAvatar(repoData.owner.avatar_url);
    } else {
      const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(text)}`, { headers: GITHUB_HEADERS });
      const json = await res.json();
      if (!json?.items?.length) {
        await kit.react(sock, msg, "✖️");
        return kit.reply(sock, msg, "《✧》 No se encontraron resultados.");
      }
      if (json.items.length === 1) {
        const repo = json.items[0];
        zip = await fetchZip(repo.owner.login, repo.name);
        repos.push(repo);
      } else {
        repos = json.items;
      }
      image = await fetchAvatar(repos[0].owner.avatar_url);
    }

    const info = repos
      .map(
        (repo, index) => `✩ Resultado: ${index + 1}
✩ Creador: ${repo.owner.login}
✩ Nombre: ${repo.name}
✩ Creado: ${formatDate(repo.created_at)}
✩ Actualizado: ${formatDate(repo.updated_at)}
✩ Visitas: ${repo.watchers}
✩ Bifurcado: ${repo.forks}
✩ Estrellas: ${repo.stargazers_count}
✩ Issues: ${repo.open_issues}
✩ Descripción: ${repo.description ? repo.description : "Sin Descripción"}
✩ Enlace: ${repo.clone_url}`
      )
      .join("\n────────────────────\n");

    await sock.sendMessage(chatId, { image, caption: info.trim() }, { quoted: msg });
    if (zip) {
      await sock.sendMessage(
        chatId,
        { document: zip.buffer, mimetype: "application/zip", fileName: zip.zipName },
        { quoted: msg }
      );
    }
    await kit.react(sock, msg, "✔️");
  } catch (e) {
    await kit.react(sock, msg, "✖️");
    return kit.reply(sock, msg, kit.errorText(usedPrefix, command, e));
  }
};

handler.command = ["gitclone", "git"];
handler.description = "Buscar y descargar un repositorio de GitHub.";
handler.category = "Utilidades";
module.exports = handler;
