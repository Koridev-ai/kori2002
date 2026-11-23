"use strict";

async function sendRichHtml(sock, chatId, title, html, options = {}) {
  const quoted = options.quoted && options.quoted.key ? options.quoted : undefined;
  return sock.sendRichHtml(chatId, title, html, quoted, {
    tabHeader: options.tabHeader || "KORI",
    trustedSources: options.trustedSources,
    wrapped: options.wrapped === true
  });
}

module.exports = { sendRichHtml };
