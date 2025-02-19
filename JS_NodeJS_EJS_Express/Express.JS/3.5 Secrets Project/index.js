//To see how the final website should work, run "node solution.js".
//Make sure you have installed all the dependencies with "npm i".
//The password is ILoveProgramming

import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;
var auth = false;

app.listen(port, () => {
    console.log(`ExpressJS is runing on port ${port}`)
});

app.get("/", (req, res) => {
    res.sendFile(__dirname+"/public/index.html");
});

app.use(bodyParser.urlencoded({extended: true}));
app.use(checkPassword);

app.post("/check", (req, res) => {
   if(auth)
        res.status(200).sendFile(__dirname+"/public/secret.html");
    else
        res.status(405).send("Wrong password!");
});

function checkPassword(req, res, next){
    auth = (req.body.password === "ILoveProgramming")
    next();
}