/*------------------------------------------------------------------------------
-                            Initial preparations                              -
------------------------------------------------------------------------------*/
// Creating the express app and the socket.io server:
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const app = express(); //create express app
const server = http.createServer(app); //create the server from the express app
const io = socketio(server); //create the socket on the server side

//For creating and reading files:
const fs = require('fs');

//Setting the file paths:
app.use('/jsPsych', express.static(__dirname + "/jsPsych")); //where jsPsych is
app.use(express.static(__dirname + '/public'));

/*------------------------------------------------------------------------------
-                                Config and Users                              -
------------------------------------------------------------------------------*/

//Getting the config:
//For some reason it only returns an empty object when I do this...
//const config = require('./config.js');

//Manual config:
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


//getting the rooms:
var tempRooms = [], newRoomName;
for (var i = 0; i < config.partNB/(2*config.conditions.length); i++) {
    for (var ii = 0; ii < config.conditions.length; ii++) {
        newRoomName = config.conditions[ii] + i;
        tempRooms.push(newRoomName);
    }
}


const partialRooms = [];
const fullRooms = [];
const emptyRooms = tempRooms;
// const emptyRooms = [];
// for (var i = 0; i < tempRooms.length; i++) {
//     emptyRooms.push({
//         condition: tempRooms[i],
//         players: []
//     });
// }

console.log(emptyRooms);
//Getting the users module:
const {
    addUser,
    getUser,
    userLeave,
    getRoomUsers,
    getOtherPlayer
} = require('./public/js/utils/users');

/*------------------------------------------------------------------------------
-                   Getting the port and launching the app                     -
------------------------------------------------------------------------------*/
const localPort = 3000;
//detect if it is uploaded on a server or if it is local
const PORT = process.env.PORT || localPort;
server.listen(PORT, function(){
    console.log(`Server running on port ${PORT}`);
    var serverURL = "";
    if (PORT === localPort) {
        serverURL += `http://localhost:${PORT}/`;
    }else {
        serverURL += PORT;
    }
    console.log("Server should be available at: " + serverURL);
});

/*------------------------------------------------------------------------------
-                          Run on client connection                            -
------------------------------------------------------------------------------*/

io.on('connection', function(socket){

    //Log on connection:
    console.log('New connection by ' + socket.id);

    //Sending to a room:
    var participantRoom;
    var isEnteredPartialRoom = false;
    if (partialRooms.length !== 0) {//A room needs filling:
        //randomly select one of the partial rooms
        participantRoom = popChoice(partialRooms);
        //Set this to true to launch the experiment for the users of this room
        isEnteredPartialRoom = true;
        //send this room to the fullRooms
        fullRooms.push(participantRoom);

    } else if (emptyRooms.length !== 0){//Open new room:
        //Randomly select one of the empty rooms
        participantRoom = popChoice(emptyRooms);
        //send this room to the partialRooms
        partialRooms.push(participantRoom);
    } else {//The game is empty...
        // TODO: What should I do if the game is empty?
    }

    //Add the user:
    const user = addUser(socket.id, participantRoom);
    //Join this user to the room selected:
    socket.join(user.room);

    //Get the experiment settings that will be sent when the experiment is started
    const experimentSettings = {
        config: config,
        condition: user.room
    };

    //If they joined a room with another player waiting:
    if (isEnteredPartialRoom) {
        //Tell each player to start the experiment
        io.in(user.room).emit('startExperiment', experimentSettings);
    }

    //When user makes their choice:
    socket.on('player made choice', function(playerChoice){
        //Record their choice
        user.choice = playerChoice;

        //Get the other player...
        var otherPlayer = getOtherPlayer(user);
        if(otherPlayer.isWaiting){
            //If the other player is waiting for the reveal, send them the results
            sendResuts(otherPlayer);
        }
    });

    //When the user is waiting for the reveal:
    socket.on('player is waiting for results', function(){
        //Change their status
        user.isWaiting = true;

        //Get the other player...
        var otherPlayer = getOtherPlayer(user);
        if(otherPlayer.isWaiting){
            //If the other player is also waiting for the reveal, send results to both
            sendResuts(otherPlayer);
            sendResuts(user);
        }else if(otherPlayer.choice !== null){
            //If the other player made their choice but isn't at the waiting stage, send results to self
            sendResuts(user);
        }
    });

    //Once a user has seen the results, change their status
    socket.on('player received results', function(){
        user.isWaiting = false;
    });


    //Once a user finished, write down the data:
    socket.on('Write Data', function(fullUserData){
        //Adding info about the players:
        fullUserData.currentPlayer = socket.id;
        var otherPlayer = getOtherPlayer(user);
        fullUserData.otherPlayer = otherPlayer.id;

        //Writting the data to a json:
        var jsonToWrite = JSON.stringify(fullUserData);
        var jsonPath = "./Data/" + socket.id + ".json";
        fs.writeFile(jsonPath, jsonToWrite, 'utf8', function(err){if (err){console.log(err)}});
    });

    //When user disconnects
    socket.on('disconnect', function(){
        // //Get the user that left
        // const user = userLeave(socket.id);
        // //If that user exists
        // if(user){
        //     console.log(user.username, "disconnected");
        //
        //     //Tell them the other users to update their playerList
        //     io.in(user.room).emit('updatePlayerList', roomUsers);
        // }
    }); //End of disconnect

}); //End of connection

/*------------------------------------------------------------------------------
-                             Supporting Functions                             -
------------------------------------------------------------------------------*/

//Function to randomly choose an element from an array (but also removes it):
function popChoice(array) {
    var randomIndex = Math.floor(Math.random()*array.length);
    return array.splice(randomIndex, 1)[0];
}

//Function to send the results to participants:
function sendResuts(currentPlayer){

    //Get the other player
    let otherPlayer = getOtherPlayer(currentPlayer);

    //Calculate the payoffs:
    let myPayoff;
    if(currentPlayer.room.includes("A")){

        // Condition A:
        if(currentPlayer.choice === "A"){
            if(otherPlayer.choice === "A"){
                myPayoff = config.payoffs.r;
            }else{ // Player 2 chose B
                myPayoff = config.payoffs.s;
            }
        }else{// Player 1 chose B
            if(otherPlayer.choice === "A"){
                myPayoff = config.payoffs.t;
            }else{ // Player 2 chose B
                myPayoff = config.payoffs.p;
            }
        }

    }else{

        // Condition B:
        if(currentPlayer.choice === "A"){
            if(otherPlayer.choice === "A"){
                myPayoff = config.payoffs.p;
            }else{ // Player 2 chose B
                myPayoff = config.payoffs.t;
            }
        }else{// Player 1 chose B
            if(otherPlayer.choice === "A"){
                myPayoff = config.payoffs.s;
            }else{ // Player 2 chose B
                myPayoff = config.payoffs.r;
            }
        }
    }

    //Update the user's payoffs
    currentPlayer.payoff = myPayoff;

    //Prepare the html to show the results
    let resultsHTML = `
    <h3>These are the results:</h3>
    <p>You chose <b>option ${currentPlayer.choice}</b>.</p>
    <p>The other participant chose <b>option ${otherPlayer.choice}</b>.</p>
    <p>Therefore, you will obtain a <b>bonus £${myPayoff}</b>.</p>
    <p>Please press continue so that you can answer a few more questions before your can receive you reward</p>
    `;

    //Send that html to the user to show them the results
    io.to(currentPlayer.id).emit('show results', resultsHTML);
}
