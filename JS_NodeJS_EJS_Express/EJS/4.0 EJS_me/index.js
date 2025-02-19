import express from "express";
import ejs from "ejs";
import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));


function currentDay(){
    let currentDate = new Date();
    let daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return daysOfWeek[currentDate.getDay()];
}

function randomActivity(){
    let activities = ["eat", "rest", "go to the gym", "dance", "die", "dye your hair"];
    return activities[Math.floor(Math.random() * activities.length) ]
}

function getImg(activity){
    switch (activity){
        case "die":
            return "https://media.tenor.com/g1bZgt4-tL4AAAAM/skull.gif";
        case "dance":
            return "https://www.bigfooty.com/forum/media/le-funny-dance-funny-dance-gif-gif.140535/full";
        case "go to the gym":
            return "https://vevmo.com/sites/default/files/5-Workout.gif";
        case "eat":
            return "https://media2.giphy.com/media/SasDDqOSRclNu/200w.gif?cid=6c09b9526jdf3svdnff7crmdisiv3n4hqsbby8jji8fdpe58&ep=v1_gifs_search&rid=200w.gif&ct=g";
        case "rest":
            return "https://i.pinimg.com/originals/eb/b2/53/ebb2533fc574395a36c18c2795516d6b.gif";
        default:
            return "https://media.tenor.com/thoiT3gkH90AAAAM/hair-color-hair-cream.gif";
    }   
}

const app = express();
app.set('view engine', 'ejs');

app.listen(3000, ()=>{
    console.log("running...")
});

app.get("/", (req, res)=>{
    let current_day = currentDay();
    let random_activity = randomActivity();
    let url = getImg(random_activity);
    res.render('index', {date: current_day, toDo: random_activity, url: url});
});

app.get("/favicon.ico", (req, res)=>{
    res.sendFile(__dirname+"/views/favicon.ico");
});