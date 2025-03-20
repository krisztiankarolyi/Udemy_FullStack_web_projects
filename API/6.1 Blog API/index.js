import express from "express";
import bodyParser from "body-parser";
import { MongoClient, ServerApiVersion } from "mongodb";
import { ObjectId } from "mongodb"; 
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
    console.log("Fetched all posts successfully.");
    res.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error.message);
    res.status(500).json({ message: "Error fetching posts" });
  }
});

// GET a specific post by ID
app.get("/posts/:id", async (req, res) => {
  try {
    const post = await postsCollection.findOne({ id: parseInt(req.params.id) });
    if (!post) {
      console.warn(`Post (ID: ${req.params.id}) not found.`);
      return res.status(404).json({ message: "Post not found" });
    }
    console.log(`Fetched post (ID: ${req.params.id}) successfully.`);
    res.json(post);
  } catch (error) {
    console.error(`Error fetching post (ID: ${req.params.id}):`, error.message);
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
    console.log(`Post (ID: ${post.id}) was created successfully.`);
    res.status(201).json(post);
  } catch (error) {
    console.error("Error creating post:", error.message);
    res.status(500).json({ message: "Error creating post" });
  }
});

// PATCH update a post
app.patch("/posts/:id", async (req, res) => {
  try {
    const updatedPost = await postsCollection.findOneAndUpdate(
      { id: parseInt(req.params.id) }, // Eredeti `id` mező alapján keresünk, nem `_id`
      { $set: req.body },
      { returnDocument: "before" }
   );

   console.log("findOneAndUpdate result:", updatedPost);

   if (!updatedPost.value) {
      console.warn(`Post (ID: ${req.params.id}) not found for update.`);
      return res.status(404).json({ message: "Post not found" });
   }
    console.log(`Post (ID: ${req.params.id}) has been updated successfully.`);
    console.log(updatedPost.value);
    res.json(updatedPost.value);
  } catch (error) {
    console.error(`Error updating post (ID: ${req.params.id}):`, error.message);
    res.status(500).json({ message: "Error updating post" });
  }
});

// DELETE a post (and archive it)
app.delete("/posts/:id", async (req, res) => {
  try {
    const post = await postsCollection.findOne({ id: parseInt(req.params.id) });
    if (!post) {
      console.warn(`Post (ID: ${req.params.id}) not found for deletion.`);
      return res.status(404).json({ message: "Post not found" });
    }

    await archiveCollection.insertOne(post); // Archiválás
    await postsCollection.deleteOne({ id: parseInt(req.params.id) }); // Törlés
    
    console.log(`Post (ID: ${req.params.id}) was archived and deleted successfully.`);
    res.json({ message: "Post archived and deleted" });
  } catch (error) {
    console.error(`Error deleting post (ID: ${req.params.id}):`, error.message);
    res.status(500).json({ message: "Error deleting post" });
  }
});

app.listen(port, () => {
  console.log(`🚀 API running at http://localhost:${port}`);
});
