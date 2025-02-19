var buttonColours = ["red", "blue", "green", "yellow"];
var gamePattern = [], userPattern = []
var level = 0;
const jumpscare = new Audio("./sounds/jumpscare.mp3"); jumpscare.load();

function reset(){
    level = 0;
    gamePattern = [], userPattern = []
}

function die(){
	$("h1").html("Game Over! <br><br> Press <span style='color: red'>[here] </span>to Start");
	
    if(level > 4)
        jumpScare();
    
    else{
        $("body").addClass("game-over");
        setTimeout(function(){
            $("body").removeClass("game-over");
        }, 400);
    }
    reset();
}

function jumpScare(){
	   jumpscare.play();
		$("#jumpscare").removeClass("hidden").addClass("show"); 
		setTimeout(function() {
			$("#jumpscare").removeClass("show"); 
			setTimeout(function() {
				$("#jumpscare").addClass("hidden");
			}, 500); 
		}, 1000);
}

$(document).keypress(function(){
  if(level === 0)
      nextSequence();  
});

$("span").click(function(){
    if(level === 0)
         nextSequence();         
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function nextSequence(){
    level++;
    userPattern = []
    $("h1").text("level "+level)
    let randomNumber = Math.floor(Math.random() * 4);
    let randomChosenColour = buttonColours[randomNumber];
    gamePattern.push(randomChosenColour);
	sleep(200).then(() => { 
		simonPress(randomChosenColour);
	});
    
}

function simonPress(color){
    var sound = new Audio("./sounds/"+color+".mp3");
    sound.play();
 
    $("#"+color).animate({
        opacity: '0',
    }, 75).animate({
        opacity: '1',
    }, 75);

}

function animateButton(color){
    var sound = new Audio("./sounds/"+color+".mp3");
    sound.play();
    $("#"+color).addClass("pressed");
    setTimeout(function(){
        $("#"+color).removeClass("pressed");
    },100);
}

function checkAnswer(index){
    return userPattern[index] === gamePattern[index];
}

$(".btn").click(function(event){
    if(userPattern.length < level){
        let userChosenColour = event.target.id;
        animateButton(userChosenColour);   
        userPattern.push(userChosenColour);

        if(checkAnswer(userPattern.length-1)){
           if(userPattern.length == level){
                setTimeout(function(){
                    nextSequence();
                }, 1000);
           }
        }
        else 
            die();  
    }  
});

