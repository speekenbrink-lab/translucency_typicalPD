const config = {};

// things to switch between local and server
config.path = "/multiplayerdecisions";
config.port = "8078";
config.local = true; // set to true for local game and to false for server games
config.local_server = "http://localhost:" + config.port;
config.remote_server = "https://palsws07.psychlangsci.ucl.ac.uk";

config.partNB = 4;
config.conditions = ["A", "B"];
// The number of rooms will be config.partNB/(2*config.conditions.length)
config.payoffs = {
    t: 't',
    r: 'r',
    p: 'p',
    s: 's'
};
config.showUpFee = 'z';

//Export the module:
module.exports = {
    config
};
