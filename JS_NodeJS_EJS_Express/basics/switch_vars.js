const label_a = document.getElementById("a");
const label_b = document.getElementById("b");

function swap() {
    try{
        read();
        a = a + b;
        b = a - b;
        a = a - b;
    
        label_a.value = a;
        label_b.value = b;
    }
    catch
    {
        alert("apád töke");
    }
}

function read(){
    a = parseInt(label_a.value);
    b = parseInt(label_b.value);
}
