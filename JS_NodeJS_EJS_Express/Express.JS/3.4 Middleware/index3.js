import express from "express";
import morgan  from "morgan";

const app = express();
const port = 3000;

//custom middleware
app.use((req, res, next) => {
  console.log(`New request recieved:
    Request method: [${req.method}]
    URL: '${req.url}' `);
  next();
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

app.get("/", (req, res) => {
  res.send("Hello");
});

