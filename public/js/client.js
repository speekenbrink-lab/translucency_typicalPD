/*------------------------------------------------------------------------------
-                            Web functionalities                              -
------------------------------------------------------------------------------*/

//Checking userAgent information:
var userAgent = navigator.userAgent;
//If user is on mobile, or is using neither chrome or firefox...
if (
    userAgent.indexOf("Mobi") !== -1 ||
    userAgent.indexOf("Firefox") == -1 &&
    userAgent.indexOf("Chrome") == -1
){
    //Redirect to a page that asks them to come back with a different setup.
    window.location = "redirectInternet.html";
}

//Preventing right click:
document.addEventListener("contextmenu", function(e){
  e.preventDefault();
}, false);

/*------------------------------------------------------------------------------
-                                 Startup                                     -
------------------------------------------------------------------------------*/

//Start collecting data:
var fullUserData = {};

//Add screen information to the data
//Function to get screen information
function browserInfo() {
  return info = {
    'browser': navigator.userAgent,
    'screen': {
      'availWidth': window.screen.availWidth,
      'availHeight': window.screen.availHeight,
      'width': window.screen.width,
      'height': window.screen.height
    }
  };
}
//Add it to the data
fullUserData.browserAndScreenInfo = browserInfo();


//Connect to the app:
// const socket = io();

const socket = io('' + _SERVER_ADDRESS + '', {path: _PATH + '/socket.io'}); //.connect('http://perceptsconcepts.psych.indiana.edu:3000');


//Ask for Prolific ID:
document.getElementById("prolificForm").addEventListener("submit", function(e){
    //Prevent form from firing:
    e.preventDefault();

    //Getting the id entered:
    var prolificId = e.target.elements.prolificID.value;

    //Check Prolific ID in data:
    socket.emit('Test prolific ID', prolificId); //ask server to test
    //receive answer from server
    socket.on('Result of Prolific ID test', function(isNewProlificId){
        //If this is a new id:
        if(isNewProlificId){
            //Add the system that shows a warning before leaving the page. Only added here because otherwise I cannot redirect because of a wrong prolific id without giving participants the upportunity to stay on the page.
            // Warning before leaving the page (back button, or outgoing link):
            window.onbeforeunload = function() {
                let warningMsg = "If you leave now, the experiment will end and you will not receive your payment. Are you sure you want to leave this page?";
                //Gecko + IE
                window.event.returnValue = warningMsg;
                //Gecko + Webkit, Safari, Chrome etc.
                return warningMsg;
            };

            //Set the placeholder for when participants are waiting to the page:
            document.getElementById("jspsych_target").innerHTML = "<h3>Please wait for another participant to join the room. This should not take long.</h3><p>A bell sound will play when another player has joined the room and the experiment is ready to begin.</p><br><br><p>Please contact the researcher Samuel Dupret (samuel.dupret.19@ucl.ac.uk) if you encountered a problem.</p>";

            //Add the id to the data:
            fullUserData.prolificId = prolificId;

            //Inform the server of a valid id:
            socket.emit('Provided valid prolific ID', prolificId);
        }else{ //if this is an already existant id
            //Redirect
            window.location = "redirectProlificID.html";
        }
    });
});

//If there is no room available
socket.on('Rooms are empty', function(){
    //Inform participant
    document.getElementById("jspsych_target").innerHTML = "<h3>I am very sorry, but all of the rooms for this experiment have been used.</h3><p>You can leave the experiment without completing it (disregard the warnings).<p>Please contact me if you had a problem (samuel.dupret.19@ucl.ac.uk).</p>";
});

//Start creating the experiment in jsPsych when asked by the server:
socket.on('startExperiment', function(experimentSettings){
    //Play bell sound because the other participant joined
    function playSound(soundObj) {
        var sound = document.getElementById(soundObj);
        sound.play();
    }
    playSound("bellSound");

    //console.log(experimentSettings);
    fullUserData.settings = experimentSettings;
    createInstructions(experimentSettings);
});


/*------------------------------------------------------------------------------
-                         Creating the instructions                            -
------------------------------------------------------------------------------*/
function createInstructions(experimentSettings){

    //Showing the instructions button:
    $('#toggleInstructionsButton').show();

    //Writing the instructions:
    var instructionHTML = `
    <div id="instructions-wrap">
        <h3 id="instructions-header">Instructions</h3>

        <p>Welcome to this study and thank you for participation. You have been paired with another anonymous participant. You will be given a choice to make in order to win some money. The amount of money earned depends on the choice made by you and the choice made by the other participant. On top of the money earned according to the choices, you will each receive £${experimentSettings.config.showUpFee} for answering questions about yourself and your experience making the choices. Note that payment is conditional on you completing the study.</p>

        <p>
            Please ensure that you set this page to fullscreen (press F11 on PC or go to &quot;view&gt;enter full screen&quot; on Mac).<br><br>
            Please ensure there are no distractions. <strong>This is a multiplayer game happening in real time, thereby, it is best for you and the other participant that you keep at the task at hand and do not do anything else. Notably, this will ensure you do not have to wait too long for the other participant to make their decision. </strong> <br><br>
            Please ensure the sound is working on your computer. Bell sounds will occur to signal that a certain phase of the study has started. <br><br>
            <strong>Please be aware that if you leave or refresh this page it will end the study and you will not receive your payment. </strong>
        </p>

        <p>
            There are seven parts in this study:
            <ol>
                <li>Instructions</li>
                <li>Comprehension questions about the instructions that you must answer correctly in order to progress. If you answer them incorrectly, you will be presented with the questions again. You can click the <i>Show Instructions</i> button on the top right of the screen to show the instructions again.</li>
                <li>Making your choice.</li>
                <li>Answering a first series of questions.</li>
                <li>Potential detection and new choice.</li>
                <li>The outcome of the choices is revealed.</li>
                <li>Answering a second series of questions.</li>
            </ol>
        </p>`;
    //Counterbalancing the payoffs
    if(experimentSettings.condition.includes("A")){ //condition A
        instructionHTML += `
            <p>
                You (and the other participant) can make one of two choices: <b>A or B</b>.
                <ul>
                    <li>If you <b>both choose A</b>, you will earn £${experimentSettings.config.payoffs.r} and the other participant will earn £${experimentSettings.config.payoffs.r} as well.</li>
                    <li>If <b>you choose A and the other participant chooses B</b>, you will earn £${experimentSettings.config.payoffs.s} and the other participant will earn £${experimentSettings.config.payoffs.t}.</li>
                    <li>If <b>you choose B and the other participant chooses A</b>, you will earn £${experimentSettings.config.payoffs.t} and the other participant will earn £${experimentSettings.config.payoffs.s}.</li>
                    <li>If you <b>both choose B</b>, you will earn £${experimentSettings.config.payoffs.p} and the other participant will earn £${experimentSettings.config.payoffs.p} as well.</li>
                </ul>
            </p>

            <p>Here is a table summarising the choices and outcomes:</p>

            <table id="payoffTable">
                <tr><th colspan="2" rowspan="2"><th colspan="2">Their decision
                <tr><th>A<th>B
                <tr><th rowspan="4">Your decision<th rowspan="2">A<td>You receive: £${experimentSettings.config.payoffs.r}<td>You receive: £${experimentSettings.config.payoffs.s}
                <tr><td class="theyReceive">They receive: £${experimentSettings.config.payoffs.r}<td class="theyReceive">They receive: £${experimentSettings.config.payoffs.t}
                <tr><th rowspan="2">B<td>You receive: £${experimentSettings.config.payoffs.t}<td>You receive: £${experimentSettings.config.payoffs.p}
                <tr><td class="theyReceive">They receive: £${experimentSettings.config.payoffs.s}<td class="theyReceive">They receive: £${experimentSettings.config.payoffs.p}
            </table>
        `;
    }else{ // condition B
        instructionHTML += `
            <p>
                You (and the other participant) can make one of two choices: <b>A or B</b>.
                <ul>
                    <li>If you <b>both choose A</b>, you will earn £${experimentSettings.config.payoffs.p} and the other participant will earn £${experimentSettings.config.payoffs.p} as well.</li>
                    <li>If <b>you choose A and the other participant chooses B</b>, you will earn £${experimentSettings.config.payoffs.t} and the other participant will earn £${experimentSettings.config.payoffs.s}.</li>
                    <li>If <b>you choose B and the other participant chooses A</b>, you will earn £${experimentSettings.config.payoffs.s} and the other participant will earn £${experimentSettings.config.payoffs.t}.</li>
                    <li>If you <b>both choose B</b>, you will earn £${experimentSettings.config.payoffs.r} and the other participant will earn £${experimentSettings.config.payoffs.r} as well.</li>
                </ul>
            </p>

            <p>Here is a table summarising the choices and outcomes:</p>

            <table id="payoffTable">
                <tr><th colspan="2" rowspan="2"><th colspan="2">Their decision
                <tr><th>A<th>B
                <tr><th rowspan="4">Your decision<th rowspan="2">A<td>You receive: £${experimentSettings.config.payoffs.p}<td>You receive: £${experimentSettings.config.payoffs.t}
                <tr><td class="theyReceive">They receive: £${experimentSettings.config.payoffs.p}<td class="theyReceive">They receive: £${experimentSettings.config.payoffs.s}
                <tr><th rowspan="2">B<td>You receive: £${experimentSettings.config.payoffs.s}<td>You receive: £${experimentSettings.config.payoffs.r}
                <tr><td class="theyReceive">They receive: £${experimentSettings.config.payoffs.t}<td class="theyReceive">They receive: £${experimentSettings.config.payoffs.r}
            </table>
        `;
    }

    //Preparing the translucency information
    var choiceDirectionYou, choiceDirectionOther, percentageTranslucency, redMarbles, blackMarbles;
    //If the direction is asymmetric-defection
    if (experimentSettings.condition.includes("D")) {
        //condition A
        if(experimentSettings.condition.includes("A")){
            choiceDirectionYou = "If you chose B";
            choiceDirectionOther = "If the other participant chose B";

        //Condition B
        } else {
            choiceDirectionYou = "If you chose A";
            choiceDirectionOther = "If the other participant chose A";
        }

    //If the direction is symmetric
    } else if (experimentSettings.condition.includes("S")){
        choiceDirectionYou = "Whichever choice you made";
        choiceDirectionOther = "Whichever choice the other participant made";
    }

    //If there is a high transluceny probability
    if (experimentSettings.condition.includes("L")) {
        percentageTranslucency = "20";
        redMarbles = "2";
        blackMarbles = "8";
    //If there is a low transluceny probability
    } else if (experimentSettings.condition.includes("H")){
        percentageTranslucency = "80";
        redMarbles = "8";
        blackMarbles = "2";
    }

    //Adding the translucency instructions
    instructionHTML += `
    <br>
    <p>
        Once both you and the other participant have made your choices (but not before) the following procedure takes place:
    </p>
    <p>
        <strong>${choiceDirectionYou}, there is a ${percentageTranslucency}% chance (randomly decided by the computer) that your choice will be revealed to the other participant.</strong> Imagine the computer having a jar of 10 marbles where ${redMarbles} are red and ${blackMarbles} are black. The computer randomly draws one: if it is red, your choice will be revealed to the other participant; if it is black, your choice will not be revealed to the other participant. If your choice is revealed, the other participant will see your choice and they will be given the option to change their choice or to keep their initial choice. You will not be told if your choice was revealed or not to the other participant.
    </p>
    <p>
        <strong>${choiceDirectionOther}, there is a ${percentageTranslucency}% chance (randomly decided by the computer) that their choice will be revealed to you.</strong> Imagine the computer having a jar of 10 marbles where ${redMarbles} are red and ${blackMarbles} are black. The computer randomly draws one: if it is red, the other participant’s choice will be revealed to you; if it is black, the other participant’s choice will not be revealed to you. If the other participant’s choice is revealed, their choice will be you shown to you and you will be given the option to change your choice or to keep your initial choice. The other participant will not be told if their choice was revealed to you or not.
    </p><br>
    `;

    //Adding end information
    instructionHTML += `
        <p>Your choice is real, the other participant is real, and the amounts earned are real. The outcome of the choices will be final. You cannot communicate with the other participant and you will not be able to participate in the study again.</p>
    </div>
    `;
    //Took out this sentence: ", and you will not be paired with the other participant for another choice after this choice"

    //Instructions reminder:
    //Setting the HTML
    document.getElementById('instructionsReminder').innerHTML = instructionHTML;

    return createExperiment(instructionHTML, experimentSettings);
}

//Function to toggle showing the instructions reminder:
function toggleInstructionsReminder(){

    //If the instructionsReminder is hidden it will be revealed...
    if($('#instructionsReminder').css("display") === "none"){
        //Change the button text to indicate that it will hide it
        $('#toggleInstructionsButton').html("Hide Instructions");
    }else{
        //If it is already revealed, it will be hidden, change the text back to 'show'
        $('#toggleInstructionsButton').html("Show Instructions");
    }

    //Show/Hide the instructions reminder
    $('#instructionsReminder').toggle();
}

/*------------------------------------------------------------------------------
-                                 jsPsych                                      -
------------------------------------------------------------------------------*/

function createExperiment(instructionHTML, experimentSettings){
    //create timeline
    var timeline = [];

    //Instructions:
    var instructions_button_trial = {
        type: 'html-button-response',
        stimulus: instructionHTML,
        choices: ['Continue'],
    };
    timeline.push(instructions_button_trial);

    //Instructions comprehension questions:
    var payoffResponseOptions = [
        `£${experimentSettings.config.payoffs.r}`,
        `£${experimentSettings.config.payoffs.s}`,
        `£${experimentSettings.config.payoffs.t}`,
        `£${experimentSettings.config.payoffs.p}`];
    var trueOrFalseResponseOptions = ["true", "false"];
    var comprehensionQuestions = {
        type: 'leftAligned-survey-multi-choice',
        preamble: '<p> These are comprehension questions about the instructions that you must answer correctly in order to progress. If you answer them incorrectly, you will be presented with the questions again. <strong>You can click the “Show Instructions” button on the top right of the screen to show the instructions again.</strong> </p>',
        data: {trialInformationType: "instructions_comprehension"},
        questions: [
            {
                prompt: "If you choose A and the other participant chooses B, how much will the other participant receive?",
                name: "instructionsComprehension1",
                options: payoffResponseOptions,
                required: true,
                horizontal: true
            },
            {
                prompt: "If you choose A and the other participant chooses B, how much will you receive?",
                name: "instructionsComprehension2",
                options: payoffResponseOptions,
                required: true,
                horizontal: true
            },
            {
                prompt: "There are seven parts to this study.",
                name: "instructionsComprehension3",
                options: trueOrFalseResponseOptions,
                required: true,
                horizontal: true
            },
            {
                prompt: "The rewards obtained are dependent on the choices made by you and the other participant.",
                name: "instructionsComprehension4",
                options: trueOrFalseResponseOptions,
                required: true,
                horizontal: true
            },
            {
                prompt: "You can participate more than once in this study.",
                name: "instructionsComprehension5",
                options: trueOrFalseResponseOptions,
                required: true,
                horizontal: true
            },
            {
                prompt: "You can directly communicate with the other participant.",
                name: "instructionsComprehension6",
                options: trueOrFalseResponseOptions,
                required: true,
                horizontal: true
            },
            {
                prompt: "Imagine that you chose A and that the other participant chose B, tick the most correct statement.",
                name: "instructionsComprehension7",
                options: [
                    "The other participant might detect my choice.",
                    "I might detect the other participant’s choice.",
                    "Both of the above."
                ],
                required: true,
                horizontal: false
            },
            {
                prompt: "If you made a choice that could be detected, what is the % chance that your choice will be revealed?",
                name: "instructionsComprehension8",
                options: [
                    "20.00%",
                    "33.33%",
                    "50.00%",
                    "66.66%",
                    "80.00%",
                    "99.77%"
                ],
                required: true,
                horizontal: true
            },
            {
                prompt: "If you made a choice that could be detected, and the other participant detects your choice, can they then make a new choice?",
                name: "instructionsComprehension9",
                options: trueOrFalseResponseOptions,
                required: true,
                horizontal: true
            }
        ],
    };

    //Creating the conditions for the correct answers, based on the condition
    //Payoff conditionals
    var instructionsConditional1, instructionsConditional2;
    if(experimentSettings.condition.includes("A")){ //counterbalancing A
        instructionsConditional1 = `£${experimentSettings.config.payoffs.t}`;
        instructionsConditional2 = `£${experimentSettings.config.payoffs.s}`;
    }else{ //counterbalancing B
        instructionsConditional1 = `£${experimentSettings.config.payoffs.s}`;
        instructionsConditional2 = `£${experimentSettings.config.payoffs.t}`;
    }
    //Translucency conditionals
    //Question 7
    var instructionsConditional7;
    if(experimentSettings.condition.includes("S")){ //if symmetric
        instructionsConditional7 = "Both of the above.";
    }else if(experimentSettings.condition.includes("D")){ //if asymmetric-defect
        if(experimentSettings.condition.includes("A")){ //counterbalancing A
            instructionsConditional7 = "I might detect the other participant’s choice.";
        }else{ //counterbalancing B
            instructionsConditional7 = "The other participant might detect my choice.";
        }
    }
    //Question 8
    var instructionsConditional8;
    if(experimentSettings.condition.includes("L")){ //if low translucency
        instructionsConditional8 = "20.00%";
    }else if(experimentSettings.condition.includes("H")){ //if high translucency
        instructionsConditional8 = "80.00%";
    }

    //Creating the loop
    var comprehension_loop_node = {
        timeline: [comprehensionQuestions],
        loop_function: function(data){
            //Need to get the data this way to have it as an object you can use:
            var answers = JSON.parse(data.values()[0].responses);
            //console.log(answers);
            if( //Conditions for getting the loop right and stopping the loop
                answers.instructionsComprehension1 === instructionsConditional1 &&
                answers.instructionsComprehension2 === instructionsConditional2 &&
                answers.instructionsComprehension3 === "true" &&
                answers.instructionsComprehension4 === "true" &&
                answers.instructionsComprehension5 === "false" &&
                answers.instructionsComprehension6 === "false" &&
                answers.instructionsComprehension7 === instructionsConditional7 &&
                answers.instructionsComprehension8 === instructionsConditional8 &&
                answers.instructionsComprehension9 === "true"
            ){
                return false; //stop the loop
            } else {
                //Warning participants that were incorrect and that they can consult the instructions
                alert("You made a mistake. Please remember that you can consult the instructions by clicking on the Show Instructions button in the top right of the page. The questions will show again when you close this alert.");
                return true; //loop again
            }
        }
    };
    timeline.push(comprehension_loop_node);

    //Choice:

    //Get the table of the payoffs and translucency information to remind participants:
    let startTableExtras = instructionHTML.search("<table"); //get the starting index of the table+
    let endTableExtras = instructionHTML.search("The other participant will not be told if their choice was revealed to you or not."); //get the  index of the end of the table+ (starts at "0")
    endTableExtras += 95; //add to include the other elements of the string
    //Extract this part from the instructions for the choice text
    let tableExtrasHTML = instructionHTML.slice(startTableExtras, endTableExtras);

    //We also need to extract just the table for the translucency choice
    let endJustTable = instructionHTML.search("</table>");
    endJustTable += 8; //add to include the other elements of the string
    //Grab just the table from the instructions
    let justTableHTML = instructionHTML.slice(startTableExtras, endJustTable);

    //Create the text to present for the choice:
    let choiceHTML = "<div id='instructions-wrap'><p>Please carefully make your choice. This is the choice that will determine (dependent on the other participant's choice) the amount of money you will receive as a bonus reward on top of the money you receive for answering the questions afterwards. The result of your choice will be presented after a few questions.</p><p>Here is a reminder of the possible results according to the choices made. Note that you can consult the instructions at any time by clicking on the button in the top right.</p><br>";
    choiceHTML += tableExtrasHTML;
    choiceHTML += '</div><p style="text-align: center;">Please make your choice:</p>';

    var choice_trial = {
        type: 'askForChoice',
        stimulus: choiceHTML,
        choices: ['Option A', 'Option B'],
        on_finish: function(data){
            socket.emit('player made choice', data.button_pressed);
        }
    };
    timeline.push(choice_trial);

    //Questions B:
    var questionB1 = {
        type: 'slider-with-value',
        stimulus: '<p> What choice do you think the other participant will make? </p>',
        labels: ['Option A', "I don't know", 'Option B'],
        require_movement: true,
        slider_width: 400,
        step: 1
    };
    timeline.push(questionB1);

    var questionB2 = {
      type: 'survey-text',
      questions: [
        {prompt: "Please <strong>briefly explain your reasoning</strong> for your answer to the previous question: <br> <i>What choice do you think the other participant will make?</i>", name: "explainB1", rows: 5, columns: 40, required: true}
      ],
    };
    timeline.push(questionB2);

    var questionB3 = {
        type: 'slider-with-value',
        stimulus: '<p> What do you think the other participant <b>thinks you chose</b>?  </p>',
        labels: ['Option A', "I don't know", 'Option B'],
        require_movement: true,
        slider_width: 400,
        step: 1
    };
    timeline.push(questionB3);

    var questionB4 = {
      type: 'survey-text',
      questions: [
        {prompt: "Please <strong>briefly explain your reasoning</strong> for your answer to the previous question: <br> <i>What do you think the other participant <b>thinks you chose</b>?</i>", name: "explainB3", rows: 5, columns: 40, required: true}
      ],
    };
    timeline.push(questionB4);

    var questionB5 = {
        type: 'slider-with-value',
        stimulus: '<p> If the other participant detects your choice, what do you think they would choose?  </p>',
        labels: ['Option A', "I don't know", 'Option B'],
        require_movement: true,
        slider_width: 400,
        step: 1
    };
    timeline.push(questionB5);

    var questionB6 = {
      type: 'survey-text',
      questions: [
        {prompt: "Please <strong>briefly explain your reasoning</strong> for your answer to the previous question: <br> <i>If the other participant detects your choice, what do you think they would choose?</i>", name: "explainB5", rows: 5, columns: 40, required: true}
      ],
    };
    timeline.push(questionB6);

    //Instructions comprehension questions:
    var choiceResponseOptions = ["You choose A and they choose A", "You choose A and they choose B", "You choose B and they choose A", "You choose B and they choose B"];
    var payoffComprehensionQuestions = {
        type: 'leftAligned-survey-multi-choice',
        questions: [
            {
                prompt: "Which outcome would provide you with the highest possible reward you could earn?",
                name: "payoffComprehension1",
                options: choiceResponseOptions,
                required: true,
            },
            {
                prompt: "Which outcome would provide the highest possible sum of rewards (i.e. which outcome provides the most money for both you and the other participant)?",
                name: "payoffComprehension2",
                options: choiceResponseOptions,
                required: true,
            }
        ]
    };
    timeline.push(payoffComprehensionQuestions);

    //Translucency consequences and choice:
    var translucentChoice_trial = {
        type: 'askForTranslucentChoice',
        stimulus: justTableHTML, //reuse the table from the instructions
        choices: ['Option A', 'Option B'],
        on_finish: function(data){
            socket.emit('player made translucency choice', data.button_pressed);
        }
    };
    timeline.push(translucentChoice_trial);

    //wait/Reveal:
    var waitRevealResults = {
        type: 'showResults',
        stimulus: '<p>Please wait for the other participant to finish the previous sections.</p><p>This should not take more than a few minutes.</p><p>Please do not refresh or leave the experiment or we will not be able to pay you.</p><p>A bell sound will play when the experiment is ready to continue.</p>',
        choices: ['Continue']
    };
    timeline.push(waitRevealResults);

    //Questions C:
    var questionC1 = {
        type: 'slider-with-value',
        stimulus: '<p> Do you think that the other participant detected your initial choice before making their final choice? </p>',
        labels: ['No', "I don't know", 'Yes'],
        require_movement: true,
        slider_width: 400,
        step: 1
    };
    timeline.push(questionC1);

    //Adding a question to make sure I can understand what participants where thinking if they gave me a weird answer to the previous one.
    var questionC1_5 = {
      type: 'survey-text',
      questions: [
        {prompt: "Please <strong>briefly explain your reasoning</strong> for your answer to the previous question: <br> <i>Do you think that the other participant detected your initial choice before making their final choice?</i>", name: "explainB5", rows: 5, columns: 40, required: true}
      ],
    };
    timeline.push(questionC1_5);

    var questionC2 = {
      type: 'survey-text',
      questions: [
        {prompt: "Now that you saw the choice made by the other participant, can you please briefly explain why you think they made this choice? ", name: "explainOtherPartChoice", rows: 5, columns: 40, required: true}
      ],
    };
    timeline.push(questionC2);

    var questionC3 = {
        type: 'slider-with-value',
        stimulus: '<p> If you were to play again with this exact same person, which choice would you make? </p>',
        labels: ['Option A', "I don't know", 'Option B'],
        require_movement: true,
        slider_width: 400,
        step: 1
    };
    timeline.push(questionC3);

    var questionC4 = {
        type: 'slider-with-value',
        stimulus: '<p> If you were to play again with a different person, which choice would you make? </p>',
        labels: ['Option A', "I don't know", 'Option B'],
        require_movement: true,
        slider_width: 400,
        step: 1
    };
    timeline.push(questionC4);

    var likert5 = [
      "Never",
      "Once",
      "A few times",
      "Often",
      "Very Often"
    ];

    var econExperience1 = {
        type: 'survey-likert',
        questions: [
            {prompt: "How often have you played games like this one, where money is divided up between you and another participant based on your choices, before doing this experiment?", labels: likert5, required: true}
        ],
        data: {likertResponseText: '', likertResponseNumber: ''},
        on_finish: function(data){
            //Getting the text and number of the response in a clearer way than jspsych
            var likertQuestionResponse = JSON.parse(data.responses); //get the response
            //Get the text of the response by using the response as an index
            var likertQuestionIndex = likertQuestionResponse.Q0;
            var likertResponseText = likert5[likertQuestionIndex];
            //Get the number response by incrementing it (so the scale starts at 1 not 0)
            var likertResponseNumber = likertQuestionIndex + 1;
            likertResponseNumber = likertResponseNumber.toString();
            data.likertResponseText = likertResponseText;
            data.likertResponseNumber = likertResponseNumber;
        }
    };
    timeline.push(econExperience1);

    var econExperience2 = {
        type: 'leftAligned-survey-multi-choice',
        questions: [
          {
            prompt: "Do you know the name of this particular type of game?",
            options: ["I don't know", "Money Game", "Bertrand Competition", "Prisoner's Dilemma", "Public Good's Game", "Trust Game", "Monopoly", "Traveler's Dilemma", "Dictator's Game"],
            required: true,
          }
        ],
    };
    timeline.push(econExperience2);

    //Demographics:

    //age
    var age_trial = {
        type: "spinbox",
        min: 18,
        max: 99,
        preamble: "<p>Please indicate your age:</p>"
    };
    timeline.push(age_trial);

    //gender
    var gender_trial = {
        type: 'leftAligned-survey-multi-choice',
        questions: [
        {prompt: "Please indicate your gender:", name: 'Gender', options: ["Female", "Male", "Other", "Prefer not to say"], required: true},
        ],
    };
    timeline.push(gender_trial);

    //date
    //Creating the date variables:
    var dateNumberString;
    var days = ["Select one"]; //If you make it required, make a first option that won't be chosen
    for (var i = 1; i <= 31; i++) {
        if(i < 10){
            //add a zero before single numbers
            dateNumberString = "0" + i.toString();
        }else{
            //Do not add anything before double numbers
            dateNumberString = i.toString();
        }
        days.push(dateNumberString); //add the number as a string for the plugin
    }

    var months = ["Select one"]; //If you make it required, make a first option that won't be chosen
    for (var i = 1; i <= 12; i++) {
        if(i < 10){
            //add a zero before single numbers
            dateNumberString = "0" + i.toString();
        }else{
            //Do not add anything before double numbers
            dateNumberString = i.toString();
        }
        months.push(dateNumberString); //add the number as a string for the plugin
    }

    var years = ["Select one"]; //If you make it required, make a first option that won't be chosen
    for (var i = 1900; i <= 2020; i++) {
        years.push(i.toString()); //add the number as a string for the plugin
    }

    var date_trial = {
        type: 'multi-dropdown',
        preamble: '<p>Please provide your date of birth:</p>',
        questions: [
            {
                prompt: "Day:",
                options: days,
                required: true,
                name: "day"
            },
            {
                prompt: "Month:",
                options: months,
                required: true,
                name: "month"
            },
            {
                prompt: "Year:",
                options: years,
                required: true,
                name: "year"
            }
        ]
    };
    timeline.push(date_trial);

    //Comments:
    var commentsQuestion = {
      type: 'survey-text',
      questions: [
        {prompt: "Do you have any comments and/or did you experience any issues?", name: "commentsQuestion", rows: 5, columns: 40, required: false}
      ],
    };
    timeline.push(commentsQuestion);

    //Debrief:
    var debriefStim = "<h3>Thank you for your participation.</h3><p><strong>Make sure to click the 'Continue to Prolific for your payment' button at the end of this page or your data will not be saved and you will not receive your payment.</strong></p><p>The aim of this study is to investigate strategic decision-making in two player scenarios. Namely, we are interested in people's choices between a cooperative and a self-interested options, how they think about their choice, how they think about the other participant's choice, and how they think about the choice making process.</p><p>This was investigated using a single-shot (you only played once), normal form (both participants played simultaneously), double-choice (you chose between two options) <a href='https://en.wikipedia.org/wiki/Prisoner%27s_dilemma' target='_blank'>prisoner's dilemma.</a></p><p> One of the options you were presented with was a cooperative choice (it could lead to a better outcome for both you and the other participant if they also cooperate) and the other option was a self-interest choice (it would generally lead to a better outcome for you, but a worse one for the other participant).</p><p>This was an experimental condition to test if levels of cooperation, and thoughts about the decision-making process, are influenced by the possibility of one's choice being detected by the other player. This was to investigate this <a href='https://journals.sagepub.com/doi/abs/10.1177/1043463119885102' target='_blank'>theory about cooperation in social dilemmas (such as prisoner's dilemmas).</a></p>";
    var debrief = {
        type: 'debrief',
        stimulus: debriefStim,
        choices: ['Continue to Prolific for your payment']
    };
    timeline.push(debrief);

    //Start the experiment
    var userJsPsychData;
    jsPsych.init({
      timeline: timeline,
      display_element: 'jspsych_target',
      show_progress_bar: true,
      on_finish: function() {
        //Show data to check
        //jsPsych.data.displayData();

        //Getting the data as a json string
        userJsPsychData = jsPsych.data.get().json();
        fullUserData.jsPsych = JSON.parse(userJsPsychData);

        //Send Data:
        socket.emit('Write Data', fullUserData);

        //Take out the warning before unload
        window.onbeforeunload = function() {
            return undefined;
        };

        //Redirect to back to prolific
        // window.location = String("https://app.prolific.co/submissions/complete?cc=49DC9373")
        window.location = String("https://www.google.co.uk")
      }
    });
}
