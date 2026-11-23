"use strict";

const crypto = require("crypto");

const BASE_SOURCES = ["astabot.hidenplay.net"];

async function sendRichHtml(sock, chatId, title, html, options = {}) {
  const { proto, generateWAMessageFromContent } = await import("baileys");
  const quoted = options.quoted && options.quoted.key ? options.quoted : undefined;
  const trusted = [...new Set([...BASE_SOURCES, ...(options.trustedSources || [])])];

  const data = Buffer.from(
    JSON.stringify({
      response_id: crypto.randomUUID(),
      sections: [
        {
          view_model: {
            primitive: {
              __typename: "GenAIaeacdsnwHtmlPrimitive",
              payload: html,
              trusted_sources: trusted
            },
            __typename: "GenAISingleLayoutViewModel"
          }
        }
      ]
    })
  );

  const built = generateWAMessageFromContent(
    chatId,
    {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
        botMetadata: { pluginMetadata: {}, messageDisclaimerText: "" }
      },
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: proto.AIRichResponseMessageType.AI_RICH_RESPONSE_TYPE_STANDARD,
            submessages: [{ messageType: proto.AIRichResponseSubMessageType.AI_RICH_RESPONSE_TEXT, messageText: title }],
            unifiedResponse: { data },
            contextInfo: {
              isForwarded: true,
              forwardingScore: 1,
              forwardedAiBotMessageInfo: { botJid: "0@bot" },
              forwardOrigin: proto.ContextInfo.ForwardOrigin.META_AI
            }
          }
        }
      }
    },
    { quoted, userJid: sock.user && sock.user.id ? sock.user.id : "" }
  );

  if (!built.message) throw new Error("no se pudo generar el mensaje rich");
  await sock.relayMessage(chatId, built.message, { messageId: built.key.id });
  return built;
}

module.exports = { sendRichHtml };
