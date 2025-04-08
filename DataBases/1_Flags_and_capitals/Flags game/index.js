import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
import dotenv from "dotenv";



dotenv.config(); // Betölti a .env fájl tartalmát a process.env-be

const app = express();
const port = process.env.PORT || 3000;

let totalCorrect = 0;
let quiz = [];

console.log(process.env);

// PostgreSQL kapcsolat környezeti változókból
const db = new pg.Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let dbIsAlive = false;

db.connect((err) => {
  if (err) {
    console.error("❌ Sikertelen adatbázis kapcsolat:", err.message);
    dbIsAlive = false;
  } else {
    console.log("✅ Sikeres adatbázis kapcsolat!");
    dbIsAlive = true;

    db.query("SELECT * FROM flags", (err, res) => {
      if (err) {
        console.error("❌ Hiba a lekérdezés során:", err.stack);
        dbIsAlive = false;
      } else {
        quiz = res.rows;
      }

      db.end();
    });
  }
});

let currentQuestion = {};

app.get("/", async (req, res) => {
  totalCorrect = 0;

  if (!dbIsAlive) {
    return res.status(500).render("error.ejs", {
      message: "Nem sikerült csatlakozni az adatbázishoz. Kérlek, próbáld újra később.",
    });
  }

  await nextQuestion();
  res.render("index.ejs", { question: currentQuestion });
});

// POST a new post
app.post("/submit", (req, res) => {
if(!dbIsAlive){
  return res.status(500).render("error.ejs", {
    message: "Nem sikerült csatlakozni az adatbázishoz. Kérlek, próbáld újra később.",
  });
}
else{
  let answer = req.body.answer.trim();
  let isCorrect = false;
  if (currentQuestion.country.toLowerCase() === answer.toLowerCase()) {
    totalCorrect++;
    console.log(totalCorrect);
    isCorrect = true;
  }

  nextQuestion();
  res.render("index.ejs", {
    question: currentQuestion,
    wasCorrect: isCorrect,
    totalScore: totalCorrect,
  });
}


});

function nextQuestion() {
  const randomCountry = quiz[Math.floor(Math.random() * quiz.length)];
  currentQuestion = randomCountry;
  console.log("current question:");
  console.table(currentQuestion);
}

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
