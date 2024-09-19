
    const btn = document.querySelector("button");
    const num = document.querySelector("ul").lastElementChild;
    const google = document.querySelector("ul li a");
    
    btn.onclick = function() {
        num.innerHTML = parseInt(num.textContent)+1;
        google.setAttribute("href", "localhost");
        btn.classList.toggle("huge");

    };
    

    google.style.color = "red";

