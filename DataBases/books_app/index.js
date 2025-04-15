import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
import crypto from 'crypto';
import session from "express-session";
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { render } from "ejs";

dotenv.config();
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({
    extended: true
}));

const pool = new pg.Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT)
});

app.use(session({
    secret: process.env.SESSION_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.HTTPS === "true",
        sameSite: 'lax'
    }
}));


app.use(express.static('public'));
app.set('trust proxy', true);
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
  });
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
}

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

app.get("/login", async (req, res) => {
    if (req.user) res.redirect('/myBooks');
    else res.render("login.ejs")
});

app.get("/register", async (req, res) => {
    if (req.user) res.redirect('/myBooks');
    else res.render("register.ejs")
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

            return res.redirect('/myBooks');
        });
    })(req, res, next);
});

app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/login');
    });
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




// Main page: user-specific book entries
app.get('/', isAuthenticated, async (req, res) => {

  const result = await pool.query(`
    SELECT b.*
    FROM books b`);

  res.render('index', { books: result.rows });
});

app.get("/mybooks", isAuthenticated, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT b.*, ub.rating, ub.notes, ub.read_date
        FROM books b
        JOIN user_books ub ON b.id = ub.book_id
        WHERE ub.user_id = $1
        ORDER BY ub.read_date DESC
      `, [req.user.id]);

      let books = result.rows;

      books.forEach(element => {
        let starcount =  Math.round((element.rating - 1) / 9 * 5);
        if (starcount < 1 ) starcount = 1;
        element.starCount =  starcount;
      });

      console.log(books)
      res.render("mybooks", { books: books });
    } catch (err) {
      console.error(err);
      res.status(500).send("Hiba történt a könyvek betöltésekor.");
    }
  });


  app.get('/edit/:id', isAuthenticated, async (req, res) => {
    const bookId = req.params.id;
    const userId = req.user.id;
  
    try {
      // Lekérjük a könyvet és a felhasználó értékelését (ha van)
      const result = await pool.query(`
        SELECT b.*, ub.rating, ub.notes, ub.read_date
        FROM books b
        LEFT JOIN user_books ub ON b.id = ub.book_id AND ub.user_id = $2
        WHERE b.id = $1
      `, [bookId, userId]);
  
      if (result.rowCount === 0) {
        return res.status(404).send("Könyv nem található.");
      }
  
      const book = result.rows[0];
  
      // Ha a felhasználónak nincs értékelése, akkor az adatokat ne töltse be
      const isNewReview = !book.rating; // Ha nincs rating, akkor új értékelés
  
      res.render('addBook.ejs', { isEdit: true, book, isNewReview });
  
    } catch (err) {
      console.error('Hiba a könyv betöltésekor:', err);
      res.status(500).send("Hiba történt a könyv betöltésekor.");
    }
  });

  
  app.post('/saveBook', isAuthenticated, async (req, res) => {
    const {
      book_id,
      title,
      author,
      isbn,
      rating,
      notes,
      read_date
    } = req.body;
  
    const userId = req.user.id;
  
    try {
      let bookId = book_id;
  
      if (bookId) {
        // 📘 Könyv és vélemény frissítése
        await pool.query(`
          UPDATE user_books
          SET rating = $1, notes = $2, read_date = $3
          WHERE user_id = $4 AND book_id = $5
        `, [rating || null, notes, read_date || null, userId, bookId]);
  
      } else {
        // 📘 Új könyv hozzáadása
        // 1. Először megnézzük, létezik-e már ez az ISBN
        const existingBook = await pool.query(
          "SELECT id FROM books WHERE isbn = $1",
          [isbn]
        );
  
        if (existingBook.rowCount > 0) {
          bookId = existingBook.rows[0].id;
        } else {
          // Ha nincs, új könyvet hozunk létre
          const result = await pool.query(
            "INSERT INTO books (title, author, isbn) VALUES ($1, $2, $3) RETURNING id",
            [title, author, isbn]
          );
          bookId = result.rows[0].id;
        }
  
        // 2. Kapcsolat létrehozása a user és a könyv között, vélemény és értékelés beszúrása
        await pool.query(`
          INSERT INTO user_books (user_id, book_id, rating, notes, read_date, book_isbn)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, book_id)
          DO UPDATE SET rating = EXCLUDED.rating, notes = EXCLUDED.notes, read_date = EXCLUDED.read_date
        `, [userId, bookId, rating || null, notes, read_date || null], isbn);
      }
  
      return res.render("addbook.ejs", {message: "Book and review saved successfully!", isEdit: false});
  
    } catch (err) {
      console.error('Hiba a könyv mentésekor:', err);
      res.status(500).send("Hiba történt a könyv mentésekor.");
    }
});


  app.get('/newBook', isAuthenticated, (req, res) => {
    const emptyBook = {
      id: null,
      title: '',
      author: '',
      isbn: '',
      rating: '',
      notes: '',
      read_date: ''
    };
  
    res.render('addBook.ejs', { isEdit: false, book: emptyBook });
  });
  
  app.get('/book/:isbn', isAuthenticated, async (req, res) => {
    const { isbn } = req.params;
    const username = req.session.username;
  
    // Feltételezzük, hogy van egy db.query, amivel lekérdezed az értékelést
    const result = await pool.query(
      'SELECT 1 FROM user_books WHERE user_id = (SELECT id FROM users WHERE username = $1) AND book_isbn = $2',
      [username, isbn]
    );
  
    const hasRated = result.rowCount > 0;
    res.render('book.ejs', { isbn, hasRated });
  });
  
  

  app.get('/api/book/:isbn', isAuthenticated, async (req, res) => {
    const isbn = req.params.isbn;
  
    try {
      const bookResult = await pool.query(
        `SELECT * FROM books WHERE isbn = $1`,
        [isbn]
      );
  
      if (bookResult.rowCount === 0) {
        return res.status(404).json({ error: 'Book not found' });
      }
  
      const book = bookResult.rows[0];
  
      book.coverURL = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    
      // Avg rating + read_by list + reviews
      const ratingQuery = await pool.query(
        `SELECT r.rating, r.notes, u.username
         FROM user_books r
         JOIN users u ON u.id = r.user_id
         WHERE r.book_id = $1`,
        [bookResult.rows[0].id]
      );
  
      const ratings = ratingQuery.rows;
  
      book.reviews = ratings.map(r => ({
        user: r.username,
        rating: r.rating,
        note: r.notes
      }));
  
      book.read_by = ratings.map(r => r.username);
      book.avg_rating =
        ratings.length > 0
          ? (
              ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
            ).toFixed(1)
          : null;
  
      res.json(book);
    } catch (err) {
      console.error('Error fetching book:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  
  // API route for saving a review
app.post('/api/book/:isbn/rate', isAuthenticated, async (req, res) => {
  const { isbn } = req.params;
  const { rating, note } = req.body;
  const userId = req.user.id;
  const book_isbn = isbn;

  try {
    // Find the book by ISBN
    const bookResult = await pool.query('SELECT id FROM books WHERE isbn = $1', [isbn]);
    if (bookResult.rowCount === 0) {
      return res.status(404).send('Könyv nem található.');
    }

    const bookId = bookResult.rows[0].id;

    // Check if the user has already rated the book
    const existingRating = await pool.query('SELECT * FROM user_books WHERE user_id = $1 AND book_id = $2', [userId, bookId]);
    if (existingRating.rowCount > 0) {
      return res.status(400).send('Már értékelted ezt a könyvet.');
    }

    // Insert the review into the user_books table
    await pool.query(`
      INSERT INTO user_books (user_id, book_id, rating, notes, book_isbn)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, bookId, rating, note, book_isbn]);

    res.status(200).send('Értékelés mentve.');
  } catch (err) {
    console.error('Hiba az értékelés mentésekor:', err);
    res.status(500).send('Hiba történt az értékelés mentésekor.');
  }
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


