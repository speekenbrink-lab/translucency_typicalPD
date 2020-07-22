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
const {config} = require('./config.js');

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

//Getting the users module:
const {
    seeUsers,
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

    //Test the prolific ID provided:
    socket.on('Test prolific ID', function(prolificId){

        //Get the prolific IDs:
        var currentProlificIDs = fs.readFileSync('./prolificIDs/prolificIDs.txt', 'utf8');
        currentProlificIDs = currentProlificIDs.split("\n"); //make into array

        //Create a boolean that signals whether this is a new prolific ID or not
        var isNewProlificId = true;

        //If that prolificId is already used (the file includes it)
        if(currentProlificIDs.includes(prolificId)){
            //set boolean to false
            isNewProlificId = false;

        }else{ //if it is not used yet (the file does not include it)
            //Append it to the fie with a line break
            fs.appendFile('./prolificIDs/prolificIDs.txt', prolificId + '\n', function (err) {
                if (err) {
                    // error message if append failed
                    console.log("Failed to append" + prolificId)
                }
            });
        }

        //Send back to client
        io.to(socket.id).emit('Result of Prolific ID test', isNewProlificId);

    });

    //Wait for the user to enter a valid prolific ID:
    socket.on('Provided valid prolific ID', function(prolificId){
        //Sending to a room:
        var participantRoom;
        var joinedRoom = true;
        if (partialRooms.length !== 0) {//A room needs filling:
            //randomly select one of the partial rooms
            participantRoom = popChoice(partialRooms);
        } else if (emptyRooms.length !== 0){//Open new room:
            //Randomly select one of the empty rooms
            participantRoom = popChoice(emptyRooms);
        } else {//The game is empty...
            //Note that the participant did not join a room
            joinedRoom = false;
        }

        //If a participant joined a room
        if(joinedRoom){
            //Add the user and room:
            var user = addUser(socket.id, participantRoom, prolificId);
            //Join this user to the room selected:
            socket.join(user.room);

            //Get the experiment settings that will be sent when the experiment is started
            const experimentSettings = {
                config: config,
                condition: user.room
            };

            //Get an array of the room users
            const roomUsers = getRoomUsers(user.room);
            //If the room is now full
            if(roomUsers.length === 2){
                //send this room to the fullRooms
                fullRooms.push(participantRoom);
                //Start the experiment for this user
                io.to(user.id).emit('startExperiment', experimentSettings);
                //Note them as having started the experiment
                user.startedExperiment = true;
                //Get the other player...
                var otherPlayer = getOtherPlayer(user);
                //if other player exists (they could have dropped, if so the experiment will probably only advance if there is a timeout or if a new payer joins)
                if(otherPlayer){
                    //If the other player has not started the experiment
                    if(!otherPlayer.startedExperiment){
                        //Start the experiment for this user
                        io.to(otherPlayer.id).emit('startExperiment', experimentSettings);
                        //Note them as having started the experiment
                        otherPlayer.startedExperiment = true;
                    }
                }

            //If the room is partially full
            }else if (roomUsers.length === 1) {
                //send this room to the partialRooms
                partialRooms.push(participantRoom);
            }
        }else{
            //Participant did no join a room, inform them that the experiment is full
            io.to(socket.id).emit('Rooms are empty');
        }

        //When user is waiting to make their choice:
        socket.on('player is waiting to choose', function(){
            //Get user again. It loses the previous user. Probably because it is in an if loop?
            const user = getUser(socket.id);

            //Record that they finished with the instructions
            user.finishedInstructions = true;
            //And that they are waiting to make their choice
            user.isWaitingToMakeChoice = true;

            //Get the other player...
            var otherPlayer = getOtherPlayer(user);
            //if other player exists (they could have dropped, if so the experiment will probably only advance if there is a timeout or if a new payer joins)
            if(otherPlayer){
                //If that player has also finished with instructions...
                if(otherPlayer.finishedInstructions){
                    //...signal to current user that they can make their choice
                    io.to(user.id).emit('ask for choice');
                }

                //If that player is also waiting to make their choice...
                if(otherPlayer.isWaitingToMakeChoice){
                    //...signal to other player that they can make their choice
                    io.to(otherPlayer.id).emit('ask for choice');
                }
            }
        });

        //When user makes their choice:
        socket.on('player made choice', function(playerChoice){
            //Record that they are no longer waiting to make their choice
            user.isWaitingToMakeChoice = false;

            //Record their choice
            user.choice = playerChoice;

            //Get the other player
            var otherPlayer = getOtherPlayer(user);
            //if other player exists (they could have dropped, if so the experiment will probably only advance if there is a timeout or if a new payer joins)
            if(otherPlayer){
                if(otherPlayer.isWaitingForResults){
                    //If the other player is waiting for the reveal, send them the results
                    sendResuts(otherPlayer, user);
                }
            }

        });

        //When the user is waiting for the reveal:
        socket.on('player is waiting for results', function(){
            //Change their status
            user.isWaitingForResults = true;

            //Get the other player...
            var otherPlayer = getOtherPlayer(user);
            //if other player exists (they could have dropped, if so the experiment will probably only advance if there is a timeout or if a new payer joins)
            if(otherPlayer){
                if(otherPlayer.isWaitingForResults){
                    //If the other player is also waiting for the reveal, send results to both
                    sendResuts(otherPlayer, user);
                    sendResuts(user, otherPlayer);
                }else if(otherPlayer.choice !== null){
                    //If the other player made their choice but isn't at the waiting stage, send results to self
                    sendResuts(user, otherPlayer);
                }
            }

        });

        //Once a user has seen the results, change their status
        socket.on('player received results', function(){
            user.isWaitingForResults = false;
        });

        //If a user waits too long at a stage of the experiment
        socket.on('waited too long', function(location){

            //Update their timeout, indicating that the other player timeout on them at this point in the experiment:
            user.timeout = location;
            //Get the other player...
            var otherPlayer = getOtherPlayer(user);
            //if other player does NOT exists (they could have dropped)
            if(!otherPlayer){
                //make otherPlayer a new object
                otherPlayer = {};
            }

            //Randomly make a choice for them
            var possibleChoices = ["A", "B"];
            var randomChoice = choice(possibleChoices);
            otherPlayer.choice = randomChoice;
            //This will allow the current user to continue the experiment whilst still allowing the other player to complete the experiment if he want to.

            //If the timeout occured as they wait to make their choice...
            if(location === "instructions"){
                //...signal to current user that they can make their choice
                io.to(user.id).emit('ask for choice');
            //If the timeout occured as they wait to see the results...
            }else if (location === "results") {
                //...send results to them
                sendResuts(user, otherPlayer);
            }

            //Log to server
            console.log(user.id, "waited too long in", location);
        });

        //Receive demand for information about timeout from the debrief
        socket.on("isTimeout?", function(){
            //Send information about timeout to the debrief
            io.to(user.id).emit("timeout information", user.timeout);
        });


        //Once a user finished, write down the data:
        socket.on('Write Data', function(fullUserData){
            //Adding socket and prolific IDs about the players:
            fullUserData.socketId = socket.id;
            var otherPlayer = getOtherPlayer(user);
            //if other player exists (they could have dropped, if so the experiment will probably only advance if there is a timeout or if a new payer joins)
            if(otherPlayer){
                fullUserData.otherPlayerSocketId = otherPlayer.id;
                fullUserData.otherPlayerProlificId = otherPlayer.prolificId;
            }else{ //otherwise we cannot get these values
                fullUserData.otherPlayerSocketId = "NA";
                fullUserData.otherPlayerProlificId = "NA";
            }


            //Adding the user's payoff:
            fullUserData.myPayoff = user.myPayoff;

            //Prepare the data to write to a json
            var jsonToWrite = JSON.stringify(fullUserData);
            //The name of the .json will be the prolific id
            var jsonPath = "./Data/" + fullUserData.prolificId + ".json";
            //Writting the data to a json:
            fs.writeFile(jsonPath, jsonToWrite, 'utf8', function(err){if (err){console.log(err)}});
        });
    });


    //When user disconnects
    socket.on('disconnect', function(){
        //Get the user that left
        var user = getUser(socket.id);

        //If that user exists
        if(user){
            //Log information
            console.log(user.id, "disconnected");

            //if they haven't made their choice yet
            if(user.choice === null){
                //Get that user out of the list
                var user = userLeave(user.id);

                //Update rooms:
                //Get an array of the room users
                const roomUsers = getRoomUsers(user.room);
                //If the room is now partially full
                if(roomUsers.length === 1){
                    //Get its index from the fullRooms
                    var priorIndex = fullRooms.indexOf(user.room);
                    //Take this room out of the fullRooms
                    fullRooms.splice(priorIndex, 1);
                    //send this room to the partialRooms
                    partialRooms.push(user.room);
                //If the room is now empty
                }else if (roomUsers.length === 0) {
                    //Get its index from the partialRooms
                    var priorIndex = partialRooms.indexOf(user.room);
                    //Take this room out of the partialRooms
                    partialRooms.splice(priorIndex, 1);
                    //send this room to the emptyRooms
                    emptyRooms.push(user.room);

                }

            } //Nothing to do if they have already made their choice

        }else { //If that user has not been logged in yet, nothing to do
            console.log("Undefined disconnect");
        }
    }); //End of disconnect

}); //End of connection

/*------------------------------------------------------------------------------
-                             Supporting Functions                             -
------------------------------------------------------------------------------*/

//Function to randomly choose an element from an array:
function choice(array){
    var randomIndex = Math.floor(Math.random() * array.length);
    var randomElement = array[randomIndex];
    return randomElement;
}

//Function to randomly choose an element from an array (but also removes it):
function popChoice(array) {
    var randomIndex = Math.floor(Math.random()*array.length);
    return array.splice(randomIndex, 1)[0];
}

//Function to send the results to participants:
//(first is the player of interest, second is the other player the payoff is based on)
function sendResuts(currentPlayer, otherPlayer){

    //Calculate the payoffs:
    let myPayoff, otherPayoff;
    if(currentPlayer.room.includes("A")){

        // Condition A:
        if(currentPlayer.choice === "A"){
            if(otherPlayer.choice === "A"){
                myPayoff = config.payoffs.r;
                otherPayoff = config.payoffs.r;
            }else{ // Player 2 chose B
                myPayoff = config.payoffs.s;
                otherPayoff = config.payoffs.t;
            }
        }else{// Player 1 chose B
            if(otherPlayer.choice === "A"){
                myPayoff = config.payoffs.t;
                otherPayoff = config.payoffs.s;
            }else{ // Player 2 chose B
                myPayoff = config.payoffs.p;
                otherPayoff = config.payoffs.p;
            }
        }

    }else{

        // Condition B:
        if(currentPlayer.choice === "A"){
            if(otherPlayer.choice === "A"){
                myPayoff = config.payoffs.p;
                otherPayoff = config.payoffs.p;
            }else{ // Player 2 chose B
                myPayoff = config.payoffs.t;
                otherPayoff = config.payoffs.s;
            }
        }else{// Player 1 chose B
            if(otherPlayer.choice === "A"){
                myPayoff = config.payoffs.s;
                otherPayoff = config.payoffs.t;
            }else{ // Player 2 chose B
                myPayoff = config.payoffs.r;
                otherPayoff = config.payoffs.r;
            }
        }
    }

    //Update the user's payoffs
    currentPlayer.myPayoff = myPayoff;
    //And log other information about the other player
    currentPlayer.otherPayoff = otherPayoff;
    currentPlayer.otherChoice = otherPlayer.choice;

    //Prepare the html to show the results
    let resultsHTML = `
    <h3>These are the results:</h3>
    <p>You chose <b>option ${currentPlayer.choice}</b>.</p>
    <p>The other participant chose <b>option ${otherPlayer.choice}</b>.</p>
    <p>Therefore, you will obtain a <b>bonus £${myPayoff}</b>.</p>
    <p>Please press continue so that you can answer a few more questions before your can receive you reward.</p>
    `;

    //Send that html to the user to show them the results
    io.to(currentPlayer.id).emit('show results', resultsHTML);
}
