import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const port = 3000;
export const API_URL = "https://udemy-fullstack-web-projects-wkmw.onrender.com";
app.set('trust proxy', true);

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Route to render the main page
app.get("/", async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/posts`);
    console.log("Posts have been requested by " + req.ip);
    res.render("index.ejs", { posts: response.data });
  } catch (error) {
    console.error("Error fetching posts. Info:", error.message);
    res.status(500).json({ message: "Error fetching posts" });
  }
});

// Route to render the edit page
app.get("/new", (req, res) => {
  res.render("modify.ejs", { heading: "New Post", submit: "Create Post" });
});

app.get("/edit/:id", async (req, res) => {
  try {
    const response = await axios.get(`${API_URL}/posts/${req.params.id}`);
    console.log(`Post (ID: ${req.params.id}) fetched successfully.`);
    res.render("modify.ejs", {
      heading: "Edit Post",
      submit: "Update Post",
      post: response.data,
    });
  } catch (error) {
    console.error(`Error fetching post (ID: ${req.params.id}). Info:`, error.message);
   // res.status(500).json({ message: "Error fetching post" });
   res.redirect("/");
  }
});

// Create a new post
app.post("/api/posts", async (req, res) => {
  try {
    const response = await axios.post(`${API_URL}/posts`, req.body);
    console.log(`Post (ID: ${response.data.id}) was created successfully.`);
    res.redirect("/");
  } catch (error) {
    console.error("Error creating post. Info:", error.message);
    res.status(500).json({ message: "Error creating post" });
  }
});

// Partially update a post
app.post("/api/posts/:id", async (req, res) => {
  try {
    const response = await axios.patch(`${API_URL}/posts/${req.params.id}`, req.body);
    console.log(`Post (ID: ${req.params.id}) was updated successfully.`);
    res.redirect("/");
  } catch (error) {
    console.error(`Error occurred while updating post (ID: ${req.params.id}). Info:`, error.message);
    //res.status(500).json({ message: "Error updating post", more: error.message });
    res.redirect("/");
  }
});

// Delete a post
app.get("/api/posts/delete/:id", async (req, res) => {
  try {
    await axios.delete(`${API_URL}/posts/${req.params.id}`);
    console.log(`Post (ID: ${req.params.id}) was deleted successfully.`);
    res.redirect("/");
  } catch (error) {
    console.error(`Error occurred while deleting post (ID: ${req.params.id}). Info:`, error.message);
    res.status(500).json({ message: "Error deleting post" });
  }
});

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
