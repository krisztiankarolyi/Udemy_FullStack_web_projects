import express from "express";
import axios from "axios";
import fs from "fs";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import path from "path";

const app = express();
const port = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apiKey = "7705819d-65da-4278-8a35-3f133ba0b762"; // Store this securely (e.g., env variables)
const API_URL = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest";
const PROXY_URL = "https://cors-anywhere.herokuapp.com/";


app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cookieParser());

// Home route
app.get("/", (req, res) => {
    const savedPortfolio = req.cookies.portfolio ? JSON.parse(req.cookies.portfolio) : {};
    res.render("index.ejs", { saved_portfolio: savedPortfolio });
});

// Handle portfolio updates
app.post("/", async (req, res) => {
    try {
        const { portfolio } = req.body;
        const cryptoSymbols = Object.keys(portfolio);
        
        const prices = await getPrices(cryptoSymbols);
        const date = prices.timestamp;
        delete prices.timestamp;
        
        const updatedPortfolio = mergePricesQuantities(prices, portfolio);

        res.cookie("portfolio", JSON.stringify(updatedPortfolio), { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
        res.cookie("date", date, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true });
        res.json({ date, portfolio: updatedPortfolio });
    } catch (error) {
        console.error("Error processing portfolio:", error);
        res.status(500).json({ error: "Error processing data" });
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));

async function refreshCryptoData() {
    try {
        const { data } = await axios.get(`${API_URL}?limit=5000`, {
            headers: { "X-CMC_PRO_API_KEY": apiKey }
        });
        
        fs.writeFileSync("./public/db.json", JSON.stringify(data), "utf8");
        console.log("Crypto data updated successfully");
    } catch (error) {
        console.error("Error refreshing crypto data:", error);
    }
}

async function getPrices(cryptoSymbols) {
    const filePath = "./public/db.json";
    const priceData = {};

    try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const timestamp = new Date(data.status.timestamp);
        priceData.timestamp = timestamp;

        if ((new Date() - timestamp) / (1000 * 60 * 60) > 0) {
            console.log("Data outdated, updating...");
            await refreshCryptoData();
        }

        cryptoSymbols.forEach(symbol => {
            const coin = data.data.find(coin => coin.symbol === symbol);
            if (coin) priceData[symbol] = coin.quote.USD.price;
        });
    } catch (error) {
        console.error("Error reading crypto prices:", error);
    }
    
    return priceData;
}

function mergePricesQuantities(prices, quantities) {
    return Object.keys({ ...prices, ...quantities }).reduce((acc, key) => {
        acc[key] = { price: prices[key] || null, quantity: quantities[key] || null };
        return acc;
    }, {});
}
