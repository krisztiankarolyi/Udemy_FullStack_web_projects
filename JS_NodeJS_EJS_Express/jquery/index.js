
 $("#b").click(function(){

    $("#b").toggleClass("btn-light");
    $("#b").toggleClass("btn-info");
    $("#b").html("<strong>OK<strong>");


    for(let i = 0; i < 3; i++){
        document.querySelectorAll("li")[i].style.color = "red";
      //  document.querySelectorAll("li")[i].addEventListener("click", function(){
      //      alert("ok");
        //});
    }

    setTimeout(function(){
        $("li").css("color", "blue");
       
    }, 200);

    $("#b").fadeOut();
 });

 
 $("li").click(function(){
    $("li").css("color", "yellow");
});

$(document).keypress(function(event){
    console.log(event.key);
    $("h1").prepend(event.key);
});



