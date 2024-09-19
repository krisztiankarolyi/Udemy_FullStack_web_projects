import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  let data = {
    header: "Enter your name below 👇"
  }
  res.render(__dirname+"/views/index.ejs", data );
});

app.post("/submit", (req, res) => {
  let letters = req.body.fName.length + req.body.lName.length; 
  let data = {
    header: "There are "+ letters + " letters in your name."
  }
  res.render(__dirname+"/views/index.ejs", data );
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
