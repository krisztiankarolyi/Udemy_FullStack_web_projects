import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
import crypto from 'crypto';
import session from "express-session";
import { register } from "module";

dotenv.config();

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set('trust proxy', true)

app.use(session({
  secret: process.env.SESSION_KEY, 
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.HTTPS === "true",
    sameSite: 'lax'
  }
}));


const pool = new pg.Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

let visited_countries = [];
let total = 0;

async function refreshData(username) {
  try {
    const result = await pool.query(
      "SELECT country_code FROM users_countries WHERE user_name = $1",
      [username]
    );
    visited_countries = result.rows.map(row => row.country_code);
    total = visited_countries.length;
    console.log("✅ Adatok frissítve:", visited_countries);
  } catch (err) {
    console.error("❌ Hiba a lekérdezés során:", err.stack);
  }
}


app.get("/", isAuthenticated, async (req, res) => {
  await refreshData(req.session.user.username);
  let county_list = await getCountryList(req.session.user.username);
  let visited_county_list = await getVisitedCountries(req.session.user.username);

  res.render("index.ejs", {
    countries: visited_countries,
    total: total,
    username: req.session.user.username.HTTP,
    county_list: county_list,
    visited_countries: visited_county_list
  });
});

app.post("/reset", isAuthenticated, async (req, res) => {
  const username = req.session.user.username;
  try {
    await pool.query("DELETE FROM users_countries WHERE user_name = $1", [username]);
    console.log("✅ Országok törölve:", username);
  } catch (err) {
    console.error("❌ Hiba a törlés során:", err.stack);
  }

  res.redirect("/");
});

app.get("/login", async(req, res) => {
  if (req.session.user) res.redirect('/');
  else  res.render("login.ejs")
});

app.get("/register", async(req, res) => {
  if (req.session.user) res.redirect('/');
  else res.render("register.ejs")
  
});

app.post("/register", async(req, res) => {
  let errormsg = "";
  let username = req.body.username;
  let passwordHash1 = crypto.createHash('sha256').update(req.body.password).digest('hex');
  let passwordHash2 = crypto.createHash('sha256').update(req.body.password2).digest('hex');
  if(passwordHash1 != passwordHash2){
    errormsg = "The passwords don't match";
    res.render("register.ejs", {error: errormsg});
    return;
  }

  try{
    let username_exists_query = await pool.query("SELECT  users.username FROM users WHERE users.username = $1", [username]);

    if (username_exists_query.rowCount > 0){
      let errormsg = "The username is already taken";
      res.render("register.ejs", {error: errormsg});
      return;
    }

    await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [username, passwordHash1]);
    console.info("Sikeres regisztráció!");
  }
  catch(error){
    console.error("❌ Hiba a regisztráció során:", error.stack);

  }

  console.log("uname: ", username, "pw: ", passwordHash1);

  res.render("login.ejs", {error: "Registration was successful, please login!"});
  
  
});

app.post("/add", isAuthenticated, async (req, res) => {
  let country = req.body["country"].toUpperCase();
  const username = req.session.user.username;

  if (country.length != 2) {
    console.log("trying to retrieve ISO code from country name");
    country = await getISObyCountryName(country);
    if (!country) {
      console.error("The country cannot be found");
      return res.redirect("/");
    }
  }

  console.log("📥 Beérkező ország:", country);
  let is_valid = await checkCountryCode(country, username);
  console.log("is the code valid:", is_valid);

  if (is_valid) {
    try {
      await pool.query(
        "INSERT INTO users_countries (country_code, user_name) VALUES ($1, $2)",
        [country, username]
      );
      console.log("✅ Ország hozzáadva:", country);
    } catch (err) {
      console.error("❌ Hiba a beszúrás során:", err.stack);
    }
  }
  res.redirect("/");
});



app.post("/login", async (req, res) => {
  if (req.session.user) {
    req.body.user = undefined;
  }
  const username = req.body.username;
  const password = req.body.password;

  // Jelszó hash
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 AND password = $2",
      [username, passwordHash]
    );

    if (result.rowCount === 1) {
      console.log("✅ Sikeres bejelentkezés:", username);
      req.session.user = {
        username: username
      };
      await refreshData();

      res.redirect("/");

    } else {
      console.warn("❌ Hibás bejelentkezési adatok");
      res.render("login.ejs", {
        error: "Invalid username or password."
      });
    }
  } catch (err) {
    console.error("❌ Hiba a bejelentkezés során:", err.stack);
    res.render("login.ejs", {
      error: "An error occurred during login."
    });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("❌ Hiba kijelentkezéskor:", err);
    }
    res.redirect("/login");
  });
});

app.post("/unvisit", isAuthenticated, async (req, res) => {
  if(req.body.visited_country == undefined || req.body.visited_country == "" || req.body.visited_country == null)
    return res.redirect("/");

  let username = req.session.user.username;
  let country_code = await getISObyCountryName(req.body.visited_country);


  console.log(`deleting ${username} - ${country_code}`);

  try{
    let deleteSQL = await pool.query("delete FROM users_countries WHERE users_countries.user_name = $1 and users_countries.country_code = $2", [username, country_code]); 
      console.log(deleteSQL);
    

  }
  catch(error){
    console.error(error);
  }

  res.redirect("/");
});




app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});

async function checkCountryCode(c_code, username) {
  console.log("Checking ISO code: ", c_code);

  const validCountry = await pool.query(
    "SELECT country_name FROM countries WHERE country_code = $1",
    [c_code]
  );

  if (validCountry.rowCount < 1) {
    console.warn("The country does not exist with this ISO code");
    return false;
  }

  const exists = await pool.query(
    "SELECT country_code FROM users_countries WHERE country_code = $1 AND user_name = $2",
    [c_code, username]
  );

  if (exists.rowCount > 0) {
    console.warn("This country has already been added to this user's list!");
    return false;
  }

  console.log("OK, ", validCountry.rows[0]["country_name"], " added to the list!");
  return true;
}

function capitalizeFirstLetter(val) {
  return String(val).charAt(0).toUpperCase() + String(val).toLowerCase().slice(1);
}

async function getISObyCountryName(c_name){
  c_name = c_name.trim(); // fontos!
  const getISO = await pool.query(
    "SELECT country_code FROM countries WHERE country_name ILIKE $1",
    [c_name]
  );
  if(getISO.rowCount < 1){
    console.warn("There is not any country like", c_name);
    return false;
  }
  return getISO.rows[0]["country_code"];
}

async function getCountryNameByISO(iso_code) {
  iso_code = iso_code.trim(); 
  const result = await pool.query(
    "SELECT country_name FROM countries WHERE country_code = $1",
    [iso_code]
  );
  if (result.rowCount < 1) {
    console.warn("There is no country with the ISO code", iso_code);
    return false;
  }
  return result.rows[0]["country_name"];
}




function isAuthenticated(req, res, next) {
  console.log(req.session);

  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
}

async function getCountryList(username){
  //getting the countries where the user has not been before
  let query = "select countries.country_name from countries where countries.country_name not in (select countries.country_name from countries join users_countries on users_countries.country_code = countries.country_code join users on users_countries.user_name = users.username where users.username = $1 )";
  const unvisited_countries =  await pool.query(query,  [username]);
  let clist = [];
  unvisited_countries.rows.forEach(element => {
    clist.push(element.country_name)
  });

  return clist;
}

async function getVisitedCountries(username){
  //getting the countries where the user has not been before
  let query = "select countries.country_name from countries join users_countries on users_countries.country_code = countries.country_code join users on users_countries.user_name = users.username where users.username = $1";
  const unvisited_countries =  await pool.query(query,  [username]);
  let clist = [];
  unvisited_countries.rows.forEach(element => {
    clist.push(element.country_name)
  });

  return clist;
}




