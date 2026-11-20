"use strict";

const { randomBytes } = require("crypto");

const SIGNATURE_B64 = "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC44LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YXcJdgmzQZeb4w==";
const CERT_CHAIN_B64 = [
  "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC44LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGGxMv0VzhC05crJ62cOxs83V0ireYh5LuspYcuJEMpgiZ5rXJ0eMrW+hWpXVuxxx8PT3PDhjO6XMCYHGB4/QVZkxKrUNQUXNX6Vw9n3O6RoG9mdJigqWWpaCtha+4gyY79vb7CLSwSFimwqWW6c/iut+AzTQUjWIluqSlY5XDfApsr5qMNE3IkU7S5CEelal0sYES2SiLEAuqBhDfdgzyrTlgtnjl+0WFHPeYk7ILmVUJVVHORsv28jtRNyFIHpCjenZ4OiGlWkxfGPsVsYlcgueVFFQVQmqjKdYa4vSc9SatrNZTnohpE1FruLhnRvynIVcdEDw6a0cNXtvJSfmScA0mtvhaG6SZwIuHpn2B8qoc6Imh2OlxjapKBXUHBHhUamw5VIxcmwWoqc2Z8IE6CzqD2Yr54Pweb8O0N08gQmY4uPusqa3r7RL6iGt54U6/wzPFwY8Er2aAfruoXi4N0UldPaykEeG2XKQDmHxF0S+4anXoJ1ZJNt+A++Ow+hBopPmD845fup1fAiT+FEUvvMo0usqZ1xRXwm6D9FJL5OGsGReXKOxHfxicSq/cyzqyK4i1Ba98HQz3G2LgPzc9uADEYoikinusVeSqVx1PoodxrHWZ7d83W+Pg+MdLH9fFJyTKv85LrAVPqLV4uANdMYOKd9JNNUhOMxT/ioyyZwSf/LxgbdfH1pdvGmpSOtrersf3abwHRlh/SuRa7w/I1fghgHG8+nw4QVDWqTQ20vxlXTYR4KiVPHngGHrQqaWGr7sVpqWDVzvc9S6CsXQAQtx3ANW7Io4GmaDARzp2uU1Kg3cIkItDTPC40rmR4JtXhOnn8mobggHW0k",
  "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC44LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHT0tMEMe9RBYgqbOdpei2JqwNhOr0xUqbEdpeo0uiqmSjxFncZ038xs/q4cullme2OyrqvA7+UryOyiA36mZO2K+j6O9E6GeikXDlB8QgDqco8F6YameJQNt0aAKLnhBeU4df6PLT40gcxugXX8C/4e4zaOChpUtd8uATY3/Sofzc7yL1Ts7gSIuqeT9O9aL6lCCIE0gs4NW5rdfF+5Ft3kWMFYZ490WHjb5BvVdIXTUryLGTTBc7t3LoPLmDrkCEvjQW8ipePnms8OM///7sEEuKm3h+ZkUF9JSz2By8vyW2qmXe0Ke3N40ObvC98PgdrDZQrOY9ssB63x2kjPjO0BNrrNX7MHsNiJKA6rhd0Dwam7VJlZJBrPUOErgLhuxJKRu2oF1U6p5y/TU3oFDhhhtJzduTwW3QJ40gGFwMfZAT0fios09Byj2em+pigGdQochRQwNfnisvkx5bzEPiTbI8AkEbWGvTyxw8tQYWKLt+bgivLFdF42rhdGl5WqzxvIGHR8DO1gGBmFNG5GA5nUvEk505j8fqqHyK/FY4g39RRVHERpt0QKWW9WOiuNWon6N/ebM3TpHsemEaQWUG2afYXyr8+RRVZ7f+lcRLXJAX5DGYAF83qRoxA03YGE4NLXdUSP4yyRpBJdIoJGtcZW/6B59c8osMMFz9b25sZIHi3J5oNRA5pl6vNtoYr2ICnoJudfnSEvF5HUWEBcsDMsuoZtIAPl8Hve3iijBNXtNB0cl+VCvRlFyXwhH39QR4xQp9P0kbB+ufXyB1U3bdUlVd3erPbhA4swwQYYMNoRnDPMcMOI3t/En+3eJfp/XUlBMaFDFGxlbn/2AfelaeYRdcmJmqlzaGxGj4Apr8801hikoLhD3R13qf5uT/sbSGQYvR7lHGN00qvPIGPJTTDUkl+zLZiR+6Cyq7WklXAoAGuPgyd/kB+IiiCV86gVsPe6NlzeukUBPotMHWvVtCA5bDpPJDMuhh+U+9vNBOks9fBRtuLAGvsCxUgHgxMIYwCTuoKGY73xbWsaWiQgZwzStgOZiu2xCQGRKICWHsGAt8nS9E4ZsHH2I0BN3PJDmV7XsiLX/OakWTdC3vgr/cBaIxT6afkj64ciw=="
];

const SIGNATURE = Buffer.from(SIGNATURE_B64, "base64");
const CERT_CHAIN = CERT_CHAIN_B64.map((item) => Buffer.from(item, "base64"));

const BASE_URL = "https://astabot.hidenplay.net";
const BOT_JID = "867051314767696@bot";
const DEFAULT_TRUSTED = [
  "astabot.hidenplay.net",
  "cdn.tailwindcss.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

async function sendRichHtml(sock, chatId, title, html, options = {}) {
  const trustedSources = [
    ...new Set([...DEFAULT_TRUSTED, ...(Array.isArray(options.trustedSources) ? options.trustedSources : [])])
  ];
  const tabHeader = options.tabHeader || "KORI";
  const responseId = "KoriRich_" + Date.now();

  const data = {
    response_id: responseId,
    sections: [
      {
        __typename: "GenAIUnifiedResponseSection",
        view_model: {
          __typename: "GenAISingleLayoutViewModel",
          primitive: {
            __typename: "GenAIBotProgressStatusPrimitive",
            title,
            is_in_progress: true
          }
        }
      }
    ],
    embedded_screens: [
      {
        title,
        content: [
          {
            __typename: "FOAIDNixelButtonSheets",
            tabs: [
              {
                id: "tab_0",
                tab_header: tabHeader,
                sections: [
                  {
                    __typename: "GenAIUnifiedResponseSection",
                    view_model: {
                      __typename: "GenAISingleLayoutViewModel",
                      primitive: {
                        __typename: "GenAIaeacdsnwHtmlPrimitive",
                        payload: html,
                        url: BASE_URL,
                        trusted_sources: trustedSources
                      }
                    }
                  }
                ],
                step_entries: []
              }
            ]
          }
        ]
      }
    ]
  };

  const quoted = options.quoted && options.quoted.key ? options.quoted : null;
  const quoteInfo = quoted
    ? {
        stanzaId: quoted.key.id,
        participant: quoted.key.participant || quoted.key.remoteJid,
        quotedMessage: quoted.message
      }
    : {};

  const messageId =
    typeof sock.generateMessageTag === "function"
      ? await sock.generateMessageTag()
      : randomBytes(8).toString("hex").toUpperCase();

  await sock.relayMessage(
    chatId,
    {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
        botMetadata: {
          messageDisclaimerText: "",
          botResponseId: responseId,
          verificationMetadata: {
            proofs: [
              {
                version: 1,
                useCase: 1,
                signature: SIGNATURE,
                certificateChain: CERT_CHAIN
              }
            ]
          }
        }
      },
      botForwardedMessage: {
        message: {
          richResponseMessage: {
            messageType: 1,
            unifiedResponse: {
              data: Buffer.from(JSON.stringify(data))
            },
            contextInfo: {
              forwardingScore: 1,
              isForwarded: true,
              forwardedAiBotMessageInfo: { botJid: BOT_JID },
              forwardOrigin: 4,
              ...quoteInfo
            }
          }
        }
      }
    },
    { messageId }
  );
}

module.exports = { sendRichHtml };
