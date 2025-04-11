import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
import crypto from 'crypto';
import session from "express-session";

dotenv.config();
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set('trust proxy', true);

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
  host: process.env.PGHOST,         // csak host, nem teljes URL
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT),  // biztos ami biztos
});

let items = [];


app.get("/", isAuthenticated, async (req, res) => {
  //console.log("Welcomne, ", req.session.user.username, "ID: ", req.session.user.id);
  items = await getNotes(req.session.user.id);


  res.render("index.ejs", {
    listTitle: "Today",
    listItems: items,
    user: req.session.user
  });


});

app.post("/add", isAuthenticated, async (req, res) => {
  const title = req.body.newItem?.trim();

  if (!title) {
    console.warn("Invalid add request: Empty title");
    //return res.status(400).send("Title cannot be empty.");
     res.redirect("/");
  }

  try {
    await pool.query(
      'INSERT INTO items (title, user_id) VALUES ($1, $2)',
      [title, req.session.user.id]
    );
    
       res.redirect("/");
  } catch (error) {
    console.error('Error adding new item:', error);
    res.status(500).send('Something went wrong while adding the item');
  }
    
});

app.post("/edit", isAuthenticated, async (req, res) => {
  const id = req.body.updatedItemId?.trim();  
  const newTitle = req.body.updatedItemTitle?.trim();  

  // Validáció
  if (!id || !newTitle) {
    console.warn("Invalid edit request:", { id, newTitle });
    return res.status(400).send("Invalid request: missing or empty fields.");
  }

  console.log("Editing item with ID:", id, "New title:", newTitle);
  
  try {
    const result = await pool.query(
      'UPDATE items SET title = $1 WHERE id = $2 RETURNING *',
      [newTitle, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Item not found");
    }

    res.redirect("/");  
  } catch (error) {
    console.error('Error updating item title:', error);
    res.status(500).send('Something went wrong');
  }
});

app.post("/delete", isAuthenticated, async (req, res) => {
  const id = req.body.removedItemId; 
  console.log("Deleting item with ID:", id);
  
  try {
    // Delete the item from the database
    const result = await pool.query(
      'DELETE FROM items WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Item not found");
    }

    res.redirect("/");  
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).send('Something went wrong');
  }
});


app.post("/complete", isAuthenticated, async (req, res) => {
  const id = req.body.completedItemId;
  const done = req.body.done === '1' ? 1 : 0;  
  
  try {
    const result = await pool.query(
      'UPDATE items SET done = $1 WHERE id = $2 and user_id = $3 RETURNING *',
      [done ? 0 : 1, id, req.session.user.id]  
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Item not found");
    }

    res.redirect("/");
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).send('Something went wrong');
  }
});


app.get("/login", async(req, res) => {
  if (req.session.user) res.redirect('/');
  else  res.render("login.ejs")
});

app.post("/login", async (req, res) => {
  if (req.session.user) {
    req.body.user = undefined;
  }
  const username = req.body.username;
  const password = req.body.password;
  const rememberMe = req.body.remember_me === "on";


  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1 AND password = $2",
      [username, passwordHash]
    );

    if (result.rowCount === 1) {
      console.log("✅ Sikeres bejelentkezés:", username);    

      req.session.user = {
        username: username,
        id: result.rows[0].id,
        avatarURL: result.rows[0].avatarURL || "/assets/icons/avatar.png"
      };

      console.log( req.session.user);

      if (rememberMe) {
        req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 7;
      } else {
        req.session.cookie.expires = false;
      }

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


function isAuthenticated(req, res, next) {
  if (req.session.user) next();
 else res.redirect("/login");
}

async function getNotes(user_id) {
  console.log("getting notes of ", user_id);
  let result = await pool.query("SELECT id, title, done FROM items WHERE items.user_id = $1", [user_id]);
  
  console.log(result.rows);
  
  let items = [];
  result.rows.forEach(element => {
    items.push({ id: element.id, title: element.title, done: element.done });
  });

  return items;
}



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
