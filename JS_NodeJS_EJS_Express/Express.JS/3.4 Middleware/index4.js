import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;
var bandName = "";

//mounting middleware
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }))

app.listen(port, () => {
  console.log(`Listening on port ${port}. \n PAth: ${__dirname}`);
});

function bandnameGenerator(req, res, next){
  if(req.method === "POST")
    bandName = `${req.body.street} ${req.body.pet}`;
  next();
}

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.use(bandnameGenerator);

app.post("/submit", (req, res) => {
  res.status(200).send(`Your band name is : <br>
     <strong>${bandName}</strong>`);
});

