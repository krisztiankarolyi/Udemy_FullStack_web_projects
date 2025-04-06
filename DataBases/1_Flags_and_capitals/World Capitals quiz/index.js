import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config(); // .env betöltése

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs"); // ha .ejs fájlokat használsz
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let quiz = [];
let dbIsAlive = false; // ez jelzi, hogy sikerült-e csatlakozni
let totalCorrect = 0;
let currentQuestion = {};

// PostgreSQL kapcsolat
const db = new pg.Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

db.connect((err) => {
  if (err) {
    console.error("❌ Sikertelen adatbázis kapcsolat:", err.message);
    dbIsAlive = false;
  } else {
    console.log("✅ Sikeres adatbázis kapcsolat!");
    dbIsAlive = true;

    db.query("SELECT * FROM capitals WHERE capital IS NOT NULL", (err, res) => {
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

// Kezdőlap
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

// Válasz beküldése
app.post("/submit", (req, res) => {
  if (!dbIsAlive) {
    return res.status(500).render("error.ejs", {
      message: "Nincs adatbázis kapcsolat, nem lehet válaszolni.",
    });
  }

  let answer = req.body.answer.trim();
  let isCorrect = false;

  if (currentQuestion.capital.toLowerCase() === answer.toLowerCase()) {
    totalCorrect++;
    isCorrect = true;
  }

  nextQuestion();
  res.render("index.ejs", {
    question: currentQuestion,
    wasCorrect: isCorrect,
    totalScore: totalCorrect,
  });
});

// Véletlenszerű kérdés választása
async function nextQuestion() {
  const randomCountry = quiz[Math.floor(Math.random() * quiz.length)];
  currentQuestion = randomCountry;
  console.log("current question:");
  console.table(currentQuestion);
}

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});