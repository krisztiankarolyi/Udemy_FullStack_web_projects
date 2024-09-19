import express from "express";
const app = express();
const port = 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}.`);
});

app.get("/", (req, res) => {
  res.status(200).send(req.headers);
});

app.get("/about", (req, res) => {
  res.status(200).send("<h1>about us</h1>");
});

app.get("/contact", (req, res) => {
  res.status(200).send("<h1>contact us</h1>");
});