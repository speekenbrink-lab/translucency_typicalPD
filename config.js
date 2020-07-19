const config = {};
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
