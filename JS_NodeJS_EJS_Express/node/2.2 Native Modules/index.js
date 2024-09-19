const fs = require("fs");

fs.writeFile("message.txt", "Hello !!!from nodeJS!!!", (err) => {
    if(err) throw err;
    console.log("DONE");
});

fs.readFile("message.txt", 'utf8', (err, data) => {
    if(err) throw err;
    console.log(data)
});