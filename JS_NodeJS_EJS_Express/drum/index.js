const sounds = {
    'w': new Audio('./sounds/kick-bass.mp3'),
    's': new Audio('./sounds/snare.mp3'),
    'a': new Audio('./sounds/crash.mp3'),
    'd': new Audio('./sounds/tom-1.mp3'),
    'j': new Audio('./sounds/tom-2.mp3'),
    'k': new Audio('./sounds/tom-3.mp3'),
    'l': new Audio('./sounds/tom-4.mp3')
};

function changeButtonColor(element) {
    element.style.color = "white";
    setTimeout(() => element.style.color = "#DA0463", 100);
}


const drumButtons = document.querySelectorAll(".drum");
drumButtons.forEach(drum => {
    drum.addEventListener("click", function(event) {
        let drumKey = event.target.classList[0];
        hit(drumKey);
        buttonAniamtion(drumKey);
        changeButtonColor(this);
    });
});

document.addEventListener('keydown', function(event) {
    let activeButton = document.querySelector(`.${event.key}`);
    if (activeButton) {
        hit(event.key);
        buttonAniamtion(event.key);
        changeButtonColor(activeButton);
    }
});


function hit(drumKey) {
    sounds[drumKey].load();
    const sound = sounds[drumKey];
    if (sound) {
        sound.play();
    } else {
        console.warn(`Nincs hang hozzárendelve ehhez a billentyűhöz: ${drumKey}`);
    }
}

function buttonAniamtion(currentKey){
    let activeButton = document.querySelector(`.${currentKey}`);
    activeButton.classList.add("pressed");
    setTimeout(function(){
        activeButton.classList.remove("pressed");
    }, 100);
}
