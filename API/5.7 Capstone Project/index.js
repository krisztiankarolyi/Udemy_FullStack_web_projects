
import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import fs from 'fs';



const app = express();
const port = 3000;

const apiKey = "7705819d-65da-4278-8a35-3f133ba0b762";
let API_URL = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest"

app.use(express.static("public"));
app.use(express.json()); 

app.get("/", function (req, res) {
   res.render("index.ejs", {total: 0.0});
});

app.post("/", async (req, res) => {
    try {
        const portfolioData = req.body;  
        console.log("Beérkező adatok:", portfolioData.portfolio);
        const crypto_names = portfolioData.portfolio.map(item => item.ISO);
        const quantities = portfolioData.portfolio;

        // Megvárjuk a getPrices Promise teljesítését
        const prices = await getPrices(crypto_names); 
        let total = accumulate(prices, quantities);
        console.log("total ar: ", total);
        
        // A válasz küldése
        res.render("index.ejs", {'total': 0, 'prices': prices });
    } catch (error) {
        console.error("Hiba történt az API-hívás során:", error);
        res.status(500).json({ error: "Hiba történt az adatok továbbításakor" });
    }
});


app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
  });


async function refreshStocks(){
    try {
        const apiResponse = await axios.get(API_URL+"?limit=5000", {
            headers: { "Content-Type": "application/json", "Accepts": "application/json",  "X-CMC_PRO_API_KEY": apiKey}
        });
        
        var stocks = JSON.stringify(apiResponse.data);

        var filePath = './public/db.json';
        
        fs.writeFile(filePath, stocks, (err) => {
            if (err) {
              console.error('Hiba történt a fájl mentésekor:', err);
            } else {
              console.log('Árak sikeresen mentve a crypto_prices.txt fájlba!');
            } 
        });
    }

    catch (error) {
        console.error("Hiba történt az API-hívás során:", error);
        res.status(500).json({ error: "Hiba történt az adatok továbbításakor" });
    }


}

function getPrices(cryptos) {
    return new Promise((resolve, reject) => {
        var filePath = './public/db.json';
        var dict = {};

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Hiba történt a fájl beolvasása közben:', err);
                reject(err);  // Promise visszautasítása hibával
                return;
            }

            const db = JSON.parse(data);

            cryptos.forEach(crypto => {
                const coin = db.data.find(coin => coin.symbol === crypto);
                
                if (coin) {
                    const price = coin.quote.USD.price;
                    dict[crypto] = price;
                    console.log(crypto + ` USD ára: $${price}`);
                } else {
                    console.log(crypto + " nem található a fájlban.");
                }
            });

            console.log("Szótár a kriptopénzek áraival:", dict);
            resolve(dict);  // Promise teljesítése a kész szótárral
        });
    });
}

function accumulate(prices, quantities) {
    console.log("Árak:", prices);   // Ellenőrizd, hogy valóban objektumot kapsz
    console.log("Mennyiségek:", quantities);
    
    let total = 0.0;

    // Az árak objektum minden kulcsát végigiteráljuk
    for (let key in prices) {
        if (prices.hasOwnProperty(key) && quantities.hasOwnProperty(key)) {  // Csak akkor számoljunk, ha mindkét objektumban létezik az adott kulcs
            let price = parseFloat(prices[key]);  // Próbálj meg konvertálni minden árat számra
            let quantity = parseFloat(quantities[key]);  // Próbálj meg konvertálni minden mennyiséget számra

            if (!isNaN(price) && !isNaN(quantity)) {  // Ha mindkét érték szám
                total += price * quantity;  // Összeszorozzuk és hozzáadjuk az eredményhez
            } else {
                console.log(`Hibás adat: Ár: ${prices[key]}, Mennyiség: ${quantities[key]}`);
            }
        }
    }

    return total;
}



   /*     const apiResponse = await axios.get(API_URL+"?symbol="+currencies, {
            headers: { "Content-Type": "application/json", "Accepts": "application/json",  "X-CMC_PRO_API_KEY": apiKey}
        });*/
        
      //  refreshStocks();