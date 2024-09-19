const d1 = document.querySelector(".dice .img1");
const d2 = document.querySelector(".dice .img2");
const title = document.querySelector("h1");

let r1 = Math.floor(Math.random() * 6)+1;
let r2 = Math.floor(Math.random() * 6)+1;

d1.setAttribute("src", "./images/dice"+r1+".png");
d2.setAttribute("src", "./images/dice"+r2+".png");


if(r1 > r2)
    title.textContent = "Player 1 wins!";
else if (r2 > r1)
    title.textContent = "Player 2 wins!";
else
    title.textContent = "It's a draw!";