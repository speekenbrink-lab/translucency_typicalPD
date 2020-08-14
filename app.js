/*------------------------------------------------------------------------------
-                            Initial preparations                              -
------------------------------------------------------------------------------*/
//Getting the config:
const {config} = require('./config.js');

// Creating the express app and the socket.io server:
// const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const app = express(); //create express app
//const server = http.createServer(app); //create the server from the express app

var server = app.listen(process.env.PORT || config.port, function(){
  var port = server.address().port;
  var address = ""
  if(config.local) {
    address += config.local_server + config.path + '/';
  } else {
    address += config.remote_server + config.path + '/';
  }
  console.log("Server running at port %s", port, Date());
  console.log("Server should be available at %s", address);
});

//const io = socketio(server, {path: config.path + '/socket.io'}); //create the socket on the server side
var io = require('socket.io')(server, {path: config.path + '/socket.io'});

//For creating and reading files:
const fs = require('fs');

//Setting the file paths:
//where jsPsych is
app.use(config.path + '/jsPsych', express.static(__dirname + "/jsPsych"));
app.use(config.path,express.static(__dirname + '/public'));

// construct global.js file with settings from config.js
app.get(config.path + '/js/global.js', function(req, res){
  res.setHeader('Content-type', 'text/javascript');
  var global_string = '';
  if(config.local) {
    global_string += 'var _SERVER_ADDRESS = "' + config.local_server + '"; ';
  } else {
    global_string += 'var _SERVER_ADDRESS = "' + config.remote_server + '"; ';
  }
  global_string += 'var _PATH = "' + config.path + '"; ';
  res.send(global_string);
})


/*------------------------------------------------------------------------------
-                                Config and Users                              -
------------------------------------------------------------------------------*/

// //getting the rooms:
// var tempRooms = [], newRoomName;
// for (var i = 0; i < config.partNB/(2*config.conditions.length); i++) {
//     for (var ii = 0; ii < config.conditions.length; ii++) {
//         newRoomName = config.conditions[ii] + i;
//         tempRooms.push(newRoomName);
//     }
// }
//
// const partialRooms = [];
// const fullRooms = [];
// const emptyRooms = tempRooms;

//New version of making rooms:
const partialRooms = [];
const fullRooms = [];
const emptyRooms = [
    "LDAN1", "LDBN1", "LDBN2",
    "HDAN1", "HDAN2", "HDBN1",
    "LSAN1", "LSBN1", "LSBN2",
    "HSAN1", "HSAN2",
];


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
/*
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
*/
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
            //Console.log this:
            console.log(prolificId, "has joined room", participantRoom);

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
                //Log this information
                console.log(user.prolificId, "has started the experiment in room", user.room);
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
                        //Log this information
                        console.log(otherPlayer.prolificId, "has started the experiment in room", otherPlayer.room);
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
            //Console.log this:
            console.log(prolificId, "could not join a room because no rooms are available anymore.");
        }

        //When user is waiting to make their choice:
        socket.on('player is waiting to choose', function(){
            //Get user again. It loses the previous user. Probably because it is in an if loop?
            const user = getUser(socket.id);

            //Record that they finished with the instructions
            user.finishedInstructions = true;
            //Log this information
            console.log(user.prolificId, "finished reading instructions.");
            //And that they are waiting to make their choice
            user.isWaitingToMakeInitialChoice = true;

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
                if(otherPlayer.isWaitingToMakeInitialChoice){
                    //...signal to other player that they can make their choice
                    io.to(otherPlayer.id).emit('ask for choice');
                }
            }
        });

        //When user makes their choice:
        socket.on('player made choice', function(playerChoice){
            //Record that they are no longer waiting to make their choice
            user.isWaitingToMakeInitialChoice = false;

            //Record their initial choice
            user.initialChoice = playerChoice;

            //Log this information
            console.log(user.prolificId, "made their initial choice.");

            //Get the other player
            var otherPlayer = getOtherPlayer(user);
            //if other player exists (they could have dropped, if so the experiment will probably only advance if there is a timeout or if a new payer joins)
            if(otherPlayer){
                if(otherPlayer.isWaitingToMakeTranslucentChoice){
                    //If the other player is waiting for the reveal, send them the results
                    giveTranslucencyResults(otherPlayer, user);
                }
            }

        });

        //When the user is waiting to make their translucent choice:
        socket.on('player is waiting for detection', function(){
            //Note that they are waiting to make their translucent choice
            user.isWaitingToMakeTranslucentChoice = true;

            //Get the other player...
            var otherPlayer = getOtherPlayer(user);
            //if other player exists (they could have dropped, if so the experiment will probably only advance if there is a timeout or if a new payer joins)
            if(otherPlayer){
                //If that player has made their choice
                if(otherPlayer.initialChoice !== null){
                    giveTranslucencyResults(user, otherPlayer);
                }
            }
        });

        //When the player made their translucent choice
        socket.on('player made translucency choice', function(translucentChoice){

            //If their choice was to continue
            if(translucentChoice === "Continue"){
                //Record their initial choice as their final choice
                user.finalChoice = user.initialChoice;

            } else {
                //Otherwise record their new translucent choice
                user.finalChoice = translucentChoice;
            }

            //Log this information
            console.log(user.prolificId, "made their final choice.");
        });

        //When the user is waiting for the results:
        socket.on('player is waiting for results', function(){
            //Change their status
            user.isWaitingForResults = true;

            //Get the other player...
            var otherPlayer = getOtherPlayer(user);
            //if other player exists (they could have dropped, if so the experiment will probably only advance if there is a timeout or if a new payer joins)
            if(otherPlayer){
                if(otherPlayer.isWaitingForResults){
                    //If the other player is also waiting for the results, send results to both - they can only see the results when they are both waiting for the results because their last step is the translucency choice that happens just before.
                    sendResuts(otherPlayer, user);
                    sendResuts(user, otherPlayer);
                }
            }

        });

        //Once a user has seen the results, change their status
        socket.on('player received results', function(){
            user.isWaitingForResults = false;

            //Log this information
            console.log(user.prolificId, "saw the results.");
        });

        //If a user waits too long at a stage of the experiment
        socket.on('waited too long', function(location){

            //Update their timeout, indicating that the other player timeout on them at this point in the experiment:
            user.timeout = location;
            //Get the other player...
            var otherPlayer = getOtherPlayer(user);
            //if other player does NOT exists (they could have dropped)...
            if(!otherPlayer){
                //...make otherPlayer a new object
                otherPlayer = {};
            }

            //Only assign choices if these have not been made before, otherwise this will lead to strange overrides.

            //If both choices are null...
            if (otherPlayer.initialChoice === null && otherPlayer.finalChoice === null) {
                //...Randomly make a choice for them
                var possibleChoices = ["A", "B"];
                var randomChoice = choice(possibleChoices);
                otherPlayer.initialChoice = randomChoice;
                otherPlayer.finalChoice = randomChoice;
            } else if (otherPlayer.initialChoice !== null && otherPlayer.finalChoice === null) {
                //If the initial choice is already made, set the final choice to the initial choice
                otherPlayer.finalChoice = otherPlayer.initialChoice;
            }

            //This will allow the current user to continue the experiment whilst still allowing the other player to complete the experiment if he want to.

            //If the timeout occured as they wait to make their choice...
            if(location === "instructions"){
                //...signal to current user that they can make their choice
                io.to(user.id).emit('ask for choice');

            //if the timeout occured when they wait for the other player to make their choice so that they can make their translucent choice
            } else if (location === "choice") {
                //...send translucency outcome to them
                giveTranslucencyResults(user, otherPlayer);
            //If the timeout occured as they wait to see the results...
            } else if (location === "results") {
                //...send results to them
                sendResuts(user, otherPlayer);
            }

            //Log to server
            console.log(user.prolificId, "waited too long in", location);
        });

        //Receive demand for information about timeout from the debrief
        socket.on("isTimeout?", function(){
            //Send information about timeout to the debrief
            io.to(user.id).emit("timeout information", user.timeout);
        });


        //Once a user finished, write down the data:
        socket.on('Write Data', function(fullUserData){
            //Record that they finished the experiment
            user.finishedExperiment = true;

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

            //Add timeout information
            fullUserData.timeout = user.timeout;

            //Adding the user's choices and payoff:
            fullUserData.myInitialChoice = user.initialChoice;
            fullUserData.myFinalChoice = user.finalChoice;
            fullUserData.myPayoff = user.myPayoff;

            //Adding information about the other user:
            fullUserData.otherInitialChoice = user.otherInitialChoice;
            fullUserData.otherFinalChoice = user.otherFinalChoice;
            fullUserData.otherPayoff = user.otherPayoff;

            //Adding detection information:
            fullUserData.detectedOther = user.detectedOther;
            fullUserData.isDetected = user.isDetected;

            //Prepare the data to write to a json
            var jsonToWrite = JSON.stringify(fullUserData);
            //The name of the .json will be the prolific id
            var jsonPath = "./Data/" + fullUserData.prolificId + ".json";
            //Writting the data to a json:
            fs.writeFile(jsonPath, jsonToWrite, 'utf8', function(err){if (err){console.log(err)}});

            //Log this information
            console.log("Data was collected for", user.prolificId);
        });
    });

    //When user disconnects
    socket.on('disconnect', function(){
        //Get the user that left
        var user = getUser(socket.id);

        //If that user exists
        if(user){

            //if they haven't made their choice yet
            if(user.initialChoice === null){
                //Log information
                console.log(user.prolificId, "disconnected BEFORE making their choice.");

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

            } else { //Nothing to do if they have already made their choice

                //If they finished the experiment
                if(user.finishedExperiment){
                    //Log information
                    console.log(user.prolificId, "disconnected after finishing the experiment.");
                //If they did not finish the experiment
                } else {
                    //Log information
                    console.log(user.prolificId, "disconnected AFTER making their choice.");
                }

            }

        }else { //If that user has not been logged in yet, nothing to do
            console.log(socket.id, "disconnected before starting the experiment.");
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

//Function to send the transluceny reveal to participants:
//(first is the player of interest, second is the other player the payoff is based on)
function giveTranslucencyResults(currentPlayer, otherPlayer){

    //Determine the translucency level:
    let alpha;
    if(currentPlayer.room.includes("L")){
        //if low transluceny
        alpha = 0.2;
    } else if (currentPlayer.room.includes("H")){
        //if high transluceny
        alpha = 0.8;
    }

    //Determine if the other player can be detected:
    let isDetectable = false;
    if(currentPlayer.room.includes("S")){
        //If the translucency direction is symmetric
        isDetectable = true;
    } else if (currentPlayer.room.includes("D")){
        //If the translucency direction is asymmetric-defection...
        if (currentPlayer.room.includes("A")) {
            //Counterbalancing A, defection is choice B
            if(otherPlayer.initialChoice === "B"){
                //...if they defected they are detectable
                isDetectable = true;
            }
        } else if (currentPlayer.room.includes("B")) {
            //Counterbalancing B, defection is choice A
            if(otherPlayer.initialChoice === "A"){
                //...if they defected they are detectable
                isDetectable = true;
            }
        }
    }

    //if they can be detected
    let isDetected = false;
    let detectedChoice = null;
    if(isDetectable){
        //Generate random number between 0 (inclusive) and 1 (exclusive)
        let randomDraw = Math.random();
        //Add 0.01 so that it compensates for 0 being inclusive
        randomDraw = randomDraw + 0.01;

        //If this randomDraw is below or equal to the alpha, the other player is detected
        if (randomDraw <= alpha) {
            isDetected = true;
            detectedChoice = otherPlayer.initialChoice;
        }
    }

    //Update the user's information
    currentPlayer.detectedOther = isDetected;
    currentPlayer.otherInitialChoice = otherPlayer.initialChoice;
    //Update other player's information
    otherPlayer.isDetected = isDetected;

    //Record that they are no longer waiting for translucency information
    currentPlayer.isWaitingToMakeTranslucentChoice = false;

    //Send that html to the user to show them the results
    io.to(currentPlayer.id).emit('ask for translucent choice', detectedChoice);
}

//Function to send the results to participants:
//(first is the player of interest, second is the other player the payoff is based on)
function sendResuts(currentPlayer, otherPlayer){

    //Calculate the payoffs:
    let myPayoff, otherPayoff;
    if(currentPlayer.room.includes("A")){

        // Condition A:
        if(currentPlayer.finalChoice === "A"){
            if(otherPlayer.finalChoice === "A"){
                myPayoff = config.payoffs.r;
                otherPayoff = config.payoffs.r;
            }else{ // Player 2 chose B
                myPayoff = config.payoffs.s;
                otherPayoff = config.payoffs.t;
            }
        }else{// Player 1 chose B
            if(otherPlayer.finalChoice === "A"){
                myPayoff = config.payoffs.t;
                otherPayoff = config.payoffs.s;
            }else{ // Player 2 chose B
                myPayoff = config.payoffs.p;
                otherPayoff = config.payoffs.p;
            }
        }

    }else{

        // Condition B:
        if(currentPlayer.finalChoice === "A"){
            if(otherPlayer.finalChoice === "A"){
                myPayoff = config.payoffs.p;
                otherPayoff = config.payoffs.p;
            }else{ // Player 2 chose B
                myPayoff = config.payoffs.t;
                otherPayoff = config.payoffs.s;
            }
        }else{// Player 1 chose B
            if(otherPlayer.finalChoice === "A"){
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
    currentPlayer.otherFinalChoice = otherPlayer.finalChoice;

    //Prepare the html to show the results
    let resultsHTML = `
    <h3>These are the results:</h3>
    <p>You chose <b>option ${currentPlayer.finalChoice}</b>.</p>
    <p>The other participant chose <b>option ${otherPlayer.finalChoice}</b>.</p>
    <p>Therefore, you will obtain a <b>bonus £${myPayoff}</b>.</p>
    <p>Please press continue so that you can answer a few more questions before your can receive you reward.</p>
    `;

    //Send that html to the user to show them the results
    io.to(currentPlayer.id).emit('show results', resultsHTML);
}
