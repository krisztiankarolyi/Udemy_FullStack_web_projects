import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const pool = new pg.Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

let visited_countries = [];
let total = 0;

async function refreshData() {
  try {
    const result = await pool.query("SELECT country_code FROM visited_countries");
    visited_countries = result.rows.map(row => row.country_code);
    total = visited_countries.length;
    console.log("✅ Adatok frissítve:", visited_countries);
  } catch (err) {
    console.error("❌ Hiba a lekérdezés során:", err.stack);
  }
}

app.get("/", async (req, res) => {
  await refreshData();
  res.render("index.ejs", { countries: visited_countries, total: total });
});

app.post("/reset", async(req, res) => {
  try {
    await pool.query("DELETE FROM visited_countries WHERE id > 0");
    console.log("✅ Országok törölve:",);
  } catch (err) {
    console.error("❌ Hiba a beszúrás során:", err.stack);
  }

  res.redirect("/");
});

app.post("/add", async (req, res) => {
  let country = req.body["country"].toUpperCase();
  if(country.length != 2){
    console.log("trying to retrieve ISO code from country name");
    country = await getISObyCountryName(country);
    if(!country)
    {
      console.error("The coutry cannot be found");
      res.redirect("/");
      return;
    }
  }

  console.log("📥 Beérkező ország:", country);
  let is_valid = await checkCountryCode(country);
  console.log("is the code valid:", is_valid);

  if(is_valid){
    try {
      await pool.query("INSERT INTO visited_countries (country_code) VALUES ($1)", [country]);
      console.log("✅ Ország hozzáadva:", country);
    } catch (err) {
      console.error("❌ Hiba a beszúrás során:", err.stack);
    }
  }
  res.redirect("/");
});


app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});

async function checkCountryCode(c_code){
  console.log("Checking ISO code: ", c_code)

  const validCountry =  await pool.query("SELECT country_name FROM countries WHERE country_code =  ($1)",  [c_code]);

  if(validCountry.rowCount < 1)
  {
    console.warn("The country does not exist with this ISO code")
    return false; 
  }
   

  const exists =  await pool.query("SELECT country_code FROM visited_countries WHERE country_code =  ($1)",  [c_code]);

  if(exists.rowCount > 0)
  {
    console.warn("This country has been already added to the visited countries able!");
    return false; 
  }

console.log("OK, ", validCountry.rows[0]["country_name"]," added to the list! ")
return true
}

function capitalizeFirstLetter(val) {
  return String(val).charAt(0).toUpperCase() + String(val).toLowerCase().slice(1);
}

async function getISObyCountryName(c_name){
  c_name = capitalizeFirstLetter(c_name);
  const getISO =  await pool.query("SELECT country_code FROM countries WHERE country_name like '%' ||  ($1) || '%'",  [c_name]);
  if(getISO.rowCount < 1)
  {
    console.warn("There is not any country like ", c_name);
    return false;
  }

  console.log(getISO.rows);
  return getISO.rows[0]["country_code"];
}




