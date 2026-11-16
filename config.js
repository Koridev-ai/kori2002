const fs = require("fs");

const configFilePath = "./src/config.json";

if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, JSON.stringify({ prefix: "." }, null, 2));
}

const config = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));

global.prefix = config.prefix || ".";

global.owner = [
    ["526631079388", "Owner", true],
    ["5216631079388", "Owner", true]
];

global.mods = [
    ["115724051816605"]
];

global.isOwner = (user) => {
    user = String(user || "").replace(/[^0-9]/g, "");
    return global.owner.some((owner) => owner[0] === user);
};

global.isMod = (user) => {
    user = String(user || "").replace(/[^0-9]/g, "");
    return global.isOwner(user) || global.mods.some((mod) => mod[0] === user);
};

module.exports = { isOwner: global.isOwner, isMod: global.isMod };
