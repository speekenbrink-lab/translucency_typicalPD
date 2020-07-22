//Creating the user variable:
const users = [];

//See the users array:
function seeUsers(){
    return users;
}

//Add user info:
function addUser(id, room, prolificId){
    var user = {
        id: id, //this will be their socket.id
        room: room, //this will be the room name they are joigning
        prolificId: prolificId,
        startedExperiment: false,
        choice: null, //What choice did they make?
        isWaitingForResults: false, //Is the participant waiting for the other player to make their choice so tht results can be shown
        payoff: null, //What will their payoff be?
        finishedInstructions: false, //Has the participant finished reading instructions and answering comprehension questions?
        isWaitingToMakeChoice: false, //Are they waiting for the other participant to finish reading the instructions so that they can make their choice?
        timeout: "none", //Has the other player timed-out on them?
        myPayoff: null, //What payoff did they obtain?
        otherPayoff: null, //payoff made by their adversary
        otherChoice: null //choice made by their adversary
    }

    //push to users array
    users.push(user);
    //return the user
    return user;
}

//Get a user by its id:
function getUser(id){
    //get the index of the user
    const index = users.findIndex(user => user.id === id);

    var user;
    //If the user is in there (i.e., if the index isn't returned to -1)
    if(index !== -1){
        //Get the user
        user = users[index];
    } else {
        //Get false
        user = false;
    }

    return user;
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
    //Get the users in this room
    let bothPlayers = getRoomUsers(thisUser.room);

    //get the index of the user
    const index = bothPlayers.findIndex(user => user.id === thisUser.id);

    //If the user is in there (i.e., if the index isn't returned to -1)
    if(index !== -1){
        //remove the user from the user list
        bothPlayers.splice(index, 1);
    }

    //check that the array is not empty once you take out that user
    var otherPlayer;
    if(bothPlayers.length !== 0){
        //Return the player left from this array (i.e., the other player)
        otherPlayer = bothPlayers[0];
    }else{
        //return false
        otherPlayer = false;
    }

    return otherPlayer;
}

//Export the module:
module.exports = {
    seeUsers,
    addUser,
    getUser,
    userLeave,
    getRoomUsers,
    getOtherPlayer
};
