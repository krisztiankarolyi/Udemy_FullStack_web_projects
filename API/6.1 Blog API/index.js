import express from "express";
import bodyParser from "body-parser";
import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const port = 4000;
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function connectMongo() {
  try {
    await client.connect();
    console.log("✅ Successfully connected to MongoDB!");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}

connectMongo();
const db = client.db("blog");
const postsCollection = db.collection("posts");
const archiveCollection = db.collection("archive");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// GET all posts
app.get("/posts", async (req, res) => {
  try {
    const posts = await postsCollection.find().toArray();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts" });
  }
});

// GET a specific post by ID
app.get("/posts/:id", async (req, res) => {
  try {
    const post = await postsCollection.findOne({ id: parseInt(req.params.id) });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: "Error fetching post" });
  }
});

// POST a new post
app.post("/posts", async (req, res) => {
  try {
    const lastPost = await postsCollection.find().sort({ id: -1 }).limit(1).toArray();
    const lastId = lastPost.length > 0 ? lastPost[0].id : 0;

    const post = {
      id: lastId + 1,
      title: req.body.title,
      author: req.body.author,
      content: req.body.content,
      img_url: req.body.img_url,
      date: new Date().toISOString()
    };
    
    await postsCollection.insertOne(post);
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: "Error creating post" });
  }
});

// PATCH update a post
app.patch("/posts/:id", async (req, res) => {
  try {
    const updatedPost = await postsCollection.findOneAndUpdate(
      { id: parseInt(req.params.id) },
      { $set: req.body },
      { returnDocument: "after" }
    );

    if (!updatedPost.value) return res.status(404).json({ message: "Post not found" });
    res.json(updatedPost.value);
  } catch (error) {
    res.status(500).json({ message: "Error updating post" });
  }
});

// DELETE a post (and archive it)
app.delete("/posts/:id", async (req, res) => {
  try {
    const post = await postsCollection.findOne({ id: parseInt(req.params.id) });
    if (!post) return res.status(404).json({ message: "Post not found" });

    await archiveCollection.insertOne(post); // Archiválás
    await postsCollection.deleteOne({ id: parseInt(req.params.id) }); // Törlés
    
    res.json({ message: "Post archived and deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting post" });
  }
});

app.listen(port, () => {
  console.log(`🚀 API running at http://localhost:${port}`);
});
