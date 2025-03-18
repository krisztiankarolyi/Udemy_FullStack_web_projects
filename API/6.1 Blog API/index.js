import express from "express";
import bodyParser from "body-parser";
import fs from "fs";

const app = express();
const port = 4000;
const POSTS_FILE = "posts.json";
const ARCHIVE_FILE = "archive.json";

app.set('trust proxy', true);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Helper function to read and write posts
const readPosts = () => {
    if (!fs.existsSync(POSTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(POSTS_FILE, "utf8"));
};

const writePosts = (data) => {
    fs.writeFileSync(POSTS_FILE, JSON.stringify(data, null, 2));
};

const archivePost = (post) => {
    let archive = [];
    if (fs.existsSync(ARCHIVE_FILE)) {
        archive = JSON.parse(fs.readFileSync(ARCHIVE_FILE, "utf8"));
    }
    archive.push(post);
    fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2));
};

let posts = readPosts();
let lastId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) : 0;

// GET all posts
app.get("/posts", (req, res) => {
    console.log("Posts requested by " + req.ip);
    res.json(posts);
});

// GET a specific post by ID
app.get("/posts/:id", (req, res) => {
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
});

// POST a new post
app.post("/posts", (req, res) => {
    const post = {
        id: ++lastId,
        title: req.body.title,
        author: req.body.author,
        content: req.body.content,
        img_url: req.body.img_url,
        date: new Date().toISOString()
    };
    posts.push(post);
    writePosts(posts);
    res.status(201).json(post);
});

// PATCH update a post
app.patch("/posts/:id", (req, res) => {
    const post = posts.find(p => p.id === parseInt(req.params.id));
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (req.body.title) post.title = req.body.title;
    if (req.body.content) post.content = req.body.content;
    if (req.body.author) post.author = req.body.author;
    if (req.body.img_url) post.img_url = req.body.img_url;

    writePosts(posts);
    res.json(post);
});

// DELETE a post
app.delete("/posts/:id", (req, res) => {
    const index = posts.findIndex(p => p.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ message: "Post not found" });
    
    const [deletedPost] = posts.splice(index, 1);
    archivePost(deletedPost);
    writePosts(posts);
    
    res.json({ message: "Post archived and deleted" });
});

app.listen(port, () => {
    console.log(`API running at http://localhost:${port}`);
});
