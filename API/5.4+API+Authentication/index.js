import express from "express";
import axios from "axios";

const app = express();
const port = 3000;
const API_URL = "https://secrets-api.appbrewery.com/";

//TODO 1: Fill in your values for the 3 types of auth.
const yourUsername = "kiki";
const yourPassword = "kaki";
const yourAPIKey = "d615edbd-22b7-46ae-adae-1b19d3ad9491";
const yourBearerToken = "87d62164-530b-47c3-91d0-41f4a9dd46d6";

app.get("/", (req, res) => {
  res.render("index.ejs", { content: "API Response." });
});

app.get("/noAuth", async(req, res) => {

  //TODO 2: Use axios to hit up the /random endpoint
  //The data you get back should be sent to the ejs file as "content"
  //Hint: make sure you use JSON.stringify to turn the JS object from axios into a string.
  try{
    const response = await axios.get(API_URL+"random");
    const result = response.data;
    var cont = JSON.stringify(result);
    console.log("cotnent: "+ cont);
    res.render("index.ejs", {content: cont});
  }
  catch(error){
    res.render("index.ejs", {
      content: error.message+"\n"+ API_URL+"random",
    });
  }
});

app.get("/basicAuth", (req, res) => {
  //TODO 3: Write your code here to hit up the /all endpoint
  //Specify that you only want the secrets from page 2
  //HINT: This is how you can use axios to do basic auth:
  // https://stackoverflow.com/a/74632908
  
   axios.get(API_URL+"all?page=2", {
      auth: {
        username: yourUsername,
        password: yourPassword,
      },
    })
    .then(function (response) {
     var cont = JSON.stringify(response.data)
      console.log(cont);
      res.render("index.ejs", {content: cont});
    })
    .catch(function (error){
      console.log(error);
      res.render("index.ejs", {content: error});
    });
});

app.get("/apiKey", (req, res) => {
    //TODO 4: Write your code here to hit up the /filter endpoint
    //Filter for all secrets with an embarassment score of 5 or greater
    //HINT: You need to provide a query parameter of apiKey in the request.

    axios.get(API_URL+"filter", {
      
      params: {score: 5, apiKey: yourAPIKey}
    })
    .then(function (response) {
    var cont = JSON.stringify(response.data)
      console.log(cont);
      res.render("index.ejs", {content: cont});
    })
    .catch(function (error){
      console.log(error);
      res.render("index.ejs", {content: error});
    });

    
});

   
app.get("/bearerToken", (req, res) => {
  //TODO 5: Write your code here to hit up the /secrets/{id} endpoint
  //and get the secret with id of 42
  //HINT: This is how you can use axios to do bearer token auth:
  // https://stackoverflow.com/a/52645402

    axios.get(API_URL+"secrets/1", {
      headers: { 
        Authorization: `Bearer 87d62164-530b-47c3-91d0-41f4a9dd46d6` 
      },
      params: {score: 5, apiKey: yourAPIKey}
    })
    .then(function (response) {
    var cont = JSON.stringify(response.data)
      console.log(cont);
      res.render("index.ejs", {content: cont});
    })
    .catch(function (error){
      console.log(error);
      res.render("index.ejs", {content: error});
    });
  });


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
