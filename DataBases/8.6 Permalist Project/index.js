import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
import crypto from 'crypto';
import session from "express-session";
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

dotenv.config();
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.HTTPS === "true",
        sameSite: 'lax'
    }
}));

app.use(express.static("public"));
app.set('trust proxy', true);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

const pool = new pg.Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT)
});

passport.use(new LocalStrategy(async (username, password, done) => {
    try {
        const result = await pool.query(
            "SELECT * FROM users WHERE username = $1",
            [username]
        );

        if (result.rowCount === 0) {
            return done(null, false, { message: 'Wrong username.' });
        }

        const user = result.rows[0];
        const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

        if (user.password !== passwordHash) {
            return done(null, false, { message: 'Wrong password.' });
        }

        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});
 
passport.deserializeUser(async (id, done) => {
    try {
        const result = await pool.query(
            "SELECT id, username, avatarurl FROM users WHERE id = $1",
            [id]
        );

        if (result.rowCount === 0) {
            return done(new Error('Felhasználó nem található.'));
        }

        const user = result.rows[0];
        done(null, user);
    } catch (err) {
        done(err);
    }
});


let items = [];

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}


app.get("/", isAuthenticated, async (req, res) => {
    let listItems = await getNotes(req.user.id);
    const query = {
        q: req.query.q || '',
        filter: req.query.filter || 'all'
    };

    let filteredItems = listItems; 

    if (query.q) {
        filteredItems = filteredItems.filter(item =>
            item.title.toLowerCase().includes(query.q.toLowerCase())
        );
    }


    if (query.filter === "done") {
        filteredItems = filteredItems.filter(item => item.done);
    } else if (query.filter === "todo") {
        filteredItems = filteredItems.filter(item => !item.done);
    }

    res.render("index.ejs", {
        listTitle: "Today", 
        listItems: filteredItems,
        user: req.user, 
        query 
    });
});


app.post("/add", isAuthenticated, async (req, res) => {
    const title = req.body.newItem?.trim();

    if (!title) {
        console.warn("Invalid add request: Empty title");
        return res.redirect("/"); // FONTOS: return, hogy ne fusson tovább a kód
    }

    try {
        await pool.query(
            'INSERT INTO items (title, user_id) VALUES ($1, $2)',
            [title, req.user.id]
        );
        return res.redirect("/"); // Itt is return
    } catch (error) {
        console.error('Error adding new item:', error);
        return res.status(500).send('Something went wrong while adding the item');
    }
});

app.post("/edit", isAuthenticated, async (req, res) => {
    const id = req.body.updatedItemId?.trim();
    const newTitle = req.body.updatedItemTitle?.trim();

    // Validáció
    if (!id || !newTitle) {
        console.warn("Invalid edit request:", {
            id,
            newTitle
        });
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
        const result = await pool.query(
            'DELETE FROM items WHERE id = $1 and user_id = $2 RETURNING *', [id, req.user.id]
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
            [done ? 0 : 1, id, req.user.id]
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


app.get("/login", async (req, res) => {
    if (req.user) res.redirect('/');
    else res.render("login.ejs")
});

app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.render('login.ejs', { error: info.message });

        req.logIn(user, (err) => {
            if (err) return next(err);

            if (req.body.remember_me === 'on') {
                req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 7; // 7 nap
            } else {
                req.session.cookie.expires = false;
            }

            return res.redirect('/');
        });
    })(req, res, next);
});



app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/login');
    });
});


app.get("/register", async (req, res) => {
    if (req.user) res.redirect('/');
    else res.render("register.ejs")
});

app.post("/register", async (req, res) => {
    let errormsg = "";
    let username = req.body.username;
    let passwordHash1 = crypto.createHash('sha256').update(req.body.password).digest('hex');
    let passwordHash2 = crypto.createHash('sha256').update(req.body.password2).digest('hex');

    if (passwordHash1 != passwordHash2) {
        errormsg = "The passwords don't match";
        res.render("register.ejs", {
            error: errormsg
        });
        return;
    }

    try {
        let username_exists_query = await pool.query("SELECT  users.username FROM users WHERE users.username = $1", [username]);

        if (username_exists_query.rowCount > 0) {
            let errormsg = "The username is already taken";
            res.render("register.ejs", {
                error: errormsg
            });
            return;
        }

        await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [username, passwordHash1]);
        console.info("Sikeres regisztráció!");
    } catch (error) {
        console.error("❌ Hiba a regisztráció során:", error.stack);
    }

    console.log("uname: ", username, "pw: ", passwordHash1);
    res.render("login.ejs", {
        error: "Registration was successful, please login!"
    });
});



async function getNotes(user_id) {
    console.log("getting notes of ", user_id);
    let result = await pool.query("SELECT id, title, done FROM items WHERE items.user_id = $1 ORDER BY title asc", [user_id]);

    console.log(result.rows);

    let items = [];
    result.rows.forEach(element => {
        items.push({
            id: element.id,
            title: element.title,
            done: element.done
        });
    });

    return items;
}


//API vegpontok
app.use(express.json());

app.post("/api/edit", isAuthenticated, async (req, res) => {

    const {
        updatedItemId,
        updatedItemTitle
    } = req.body;
    const id = updatedItemId;
    const title = updatedItemTitle;

    if (!id || !title) {
        return res.status(400).json({
            error: "Missing ID or title"
        });
    }

    try {
        const result = await pool.query(
            "UPDATE items SET title = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
            [title, id, req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "Item not found"
            });
        }

        res.json({
            success: true,
            updated: result.rows[0],
            items: await getNotes(req.user.id)
        });
    } catch (err) {
        console.error("Edit error:", err);
        res.status(500).json({
            error: "Database error"
        });
    }
});


app.post("/api/search", isAuthenticated, async (req, res) => {
    try {
        const items = await getNotes(req.user.id);
        const q = req.query.q?.toLowerCase() || req.body.q || "";
        const filter = req.query.filter || req.body.filter || "all";

        let filtered = items;

        if (q) {
            filtered = filtered.filter(item => item.title.toLowerCase().includes(q));
        }

        if (filter === "done") {
            filtered = filtered.filter(item => item.done);
        } else if (filter === "todo") {
            filtered = filtered.filter(item => !item.done);
        }


        res.json({
            success: true,
            items: filtered
        });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({
            error: "Database error"
        });
    }
});

app.post("/api/complete", isAuthenticated, async (req, res) => {
    const {
        id,
        done
    } = req.body;

    if (!id || typeof done === 'undefined') {
        return res.status(400).json({
            error: "Missing ID or done status"
        });
    }

    try {
        const result = await pool.query(
            'UPDATE items SET done = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [done ? 0 : 1, id, req.user.id] // toggle
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: "Item not found"
            });
        }

        console.log(id, " UPDATED to DONE ");
        res.json({
            success: true,
            updated: result.rows[0],
            items: await getNotes(req.user.id)
        });
        
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({
            error: 'Something went wrong'
        });
    }
});


app.post("/api/delete", isAuthenticated, async (req, res) => {
    const id = req.body.id;
    console.log("API request for deleting ", id);

    if (!id) {
        return res.json({
            success: false,
            error: "ID is required"
        });
    }

    try {
        const result = await pool.query('DELETE FROM items WHERE id = $1 and user_id = $2 RETURNING *', [id, req.user.id]);

        if (result) {
            res.json({
                success: true
            });
        } else {
            res.json({
                success: false,
                error: "Item not found or already deleted"
            });
        }
    } catch (err) {
        console.error("Törlési hiba:", err);
        res.json({
            success: false,
            error: "Server error"
        });
    }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});