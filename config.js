const fs = require("fs");

const configFilePath = "./src/config.json";

if (!fs.existsSync(configFilePath)) {
    fs.writeFileSync(configFilePath, JSON.stringify({ prefix: "." }, null, 2));
}

const config = JSON.parse(fs.readFileSync(configFilePath, "utf-8"));

global.prefix = config.prefix || ".";

global.owner = [
    ["15167096032", "Owner", true],
    ["115724051816605"],
    ["595975740803"],
    ["595986172767"],
    ["507660673766"],
    ["50768888457"],
    ["584125778026"],
    ["5492266613038"],
    ["5841235520"],
    ["573242402359"],
    ["5217294888993"],
    ["5214437863111"],
    ["51906662557"],
    ["50582340051"],
    ["5217441298510"],
    ["5491155983299"],
    ["5493795319022"],
    ["5217821153974"],
    ["584163393168"],
    ["16475584916"],
    ["5216865268215"],
    ["5215639850287"],
    ["525639850287"]
];

global.isOwner = (user) => {
    user = user.replace(/[^0-9]/g, "");
    return global.owner.some((owner) => owner[0] === user);
};

module.exports = { isOwner: global.isOwner };
