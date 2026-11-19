"use strict";

const { randomUUID } = require("crypto");

const DEFAULT_TRUSTED = [
  "astabot.hidenplay.net",
  "cdn.tailwindcss.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

let waPromise = null;

async function loadBaileys() {
  if (!waPromise) waPromise = import("baileys");
  const mod = await waPromise;
  return mod.generateWAMessageFromContent ? mod : mod.default;
}

async function sendRichHtml(sock, chatId, title, html, options = {}) {
  const wa = await loadBaileys();
  const proto = wa.proto || {};
  const trustedSources = [...new Set([...DEFAULT_TRUSTED, ...(Array.isArray(options.trustedSources) ? options.trustedSources : [])])];

  const standard = proto.AIRichResponseMessageType ? proto.AIRichResponseMessageType.AI_RICH_RESPONSE_TYPE_STANDARD : 1;
  const textType = proto.AIRichResponseSubMessageType ? proto.AIRichResponseSubMessageType.AI_RICH_RESPONSE_TEXT : 2;
  const metaAi = proto.ContextInfo && proto.ContextInfo.ForwardOrigin ? proto.ContextInfo.ForwardOrigin.META_AI : 4;

  const data = Buffer.from(
    JSON.stringify({
      response_id: randomUUID(),
      sections: [
        {
          view_model: {
            primitive: {
              __typename: "GenAIaeacdsnwHtmlPrimitive",
              payload: html,
              trusted_sources: trustedSources
            },
            __typename: "GenAISingleLayoutViewModel"
          }
        }
      ]
    })
  );

  const content = {
    messageContextInfo: {
      deviceListMetadata: {},
      deviceListMetadataVersion: 2,
      botMetadata: { pluginMetadata: {}, messageDisclaimerText: "" }
    },
    botForwardedMessage: {
      message: {
        richResponseMessage: {
          messageType: standard,
          submessages: [{ messageType: textType, messageText: title }],
          unifiedResponse: { data },
          contextInfo: {
            isForwarded: true,
            forwardingScore: 1,
            forwardedAiBotMessageInfo: { botJid: "0@bot" },
            forwardOrigin: metaAi
          }
        }
      }
    }
  };

  const generated = wa.generateWAMessageFromContent(
    chatId,
    content,
    { quoted: options.quoted, userJid: (sock.user && sock.user.id) || "" }
  );
  if (!generated.message) throw new Error("No se pudo generar el mensaje HTML.");
  await sock.relayMessage(chatId, generated.message, { messageId: generated.key.id || undefined });
}

module.exports = { sendRichHtml };
