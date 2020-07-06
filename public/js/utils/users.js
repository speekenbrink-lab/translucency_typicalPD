//Creating the user variable:
const users = [];

//Add user info:
function addUser(id, room){
    var user = {
        id: id, //this will be their socket.id
        room: room, //this will be the room name they are joigning
        choice: null,
        isWaiting: false,
        payoff: null
    }

    //push to users array
    users.push(user);
    //return the user
    return user;
}

//Get a user by its id:
function getUser(id){
    return users.find(user.id === id);
}

//Remove user when they leave:
function userLeave(id){
    //get the index of the user
    const index = users.findIndex(user => user.id === id);

    //If the user is in there (i.e., if the index isn't returned to -1)
    if(index !== -1){
        //remove the user from the user list, and return that user (not the entire array)
        return users.splice(index, 1)[0];
    }
}

//Get users in a certain room:
function getRoomUsers(room){
    //Return each user where the user.room === room of interest.
    return users.filter(user => user.room === room);
}

function getOtherPlayer(thisUser){
    let bothPlayers = getRoomUsers(thisUser.room);

    //get the index of the user
    const index = bothPlayers.findIndex(user => user.id === thisUser.id);

    //If the user is in there (i.e., if the index isn't returned to -1)
    if(index !== -1){
        //remove the user from the user list
        bothPlayers.splice(index, 1);
    }

    //Return the player left from this array
    return bothPlayers[0]
}

//Export the module:
module.exports = {
    addUser,
    getUser,
    userLeave,
    getRoomUsers,
    getOtherPlayer
};
