const config = {};

// things to switch between local and server
config.path = "/multiplayerdecisions";
config.port = "8078";
config.local = true; // set to true for local game and to false for server games
config.local_server = "http://localhost:" + config.port;
config.remote_server = "https://palsws07.psychlangsci.ucl.ac.uk";

//Number of participants, needs to be a multiple of 4
config.partNB = 20;
config.conditions = ["TA", "TB"];
// The number of rooms will be config.partNB/(2*config.conditions.length)
config.payoffs = {
    t: '0.70',
    r: '0.50',
    p: '0.20',
    s: '0.10'
};
config.showUpFee = '1.00';

//Export the module:
module.exports = {
    config
};
