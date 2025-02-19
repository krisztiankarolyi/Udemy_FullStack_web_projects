import qr from 'qr-image';
import express from 'express';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
    const url = req.query.url;

    if (url && url !== "") {
        // Generate QR code as a base64 string
        const qrPng = qr.imageSync(url, { type: 'png' });
        const qrBase64 = `data:image/png;base64,${qrPng.toString('base64')}`;

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>QR Code Generator</title>
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
                <style>
                    html, body {
                        height: 100%;
                        margin: 0;
                    }
                    .content-wrapper {
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                    .footer {
                        margin-top: auto;
                    }

                    .qr img{
                        width: 250px;
                         transition-duration: 500ms;
                        transform: scale(1);
                    }

                     .qr img:hover{
                        transition-duration: 500ms;
                        transform: scale(2);
                    }

                
                </style>
            </head>
            <body class='bg-dark text-light'>
                <div class="content-wrapper">
                    <div class="container">
                        <h1 class="my-4">Generate QR Code</h1>
                        <form action="/" method="get" class="mb-4">
                            <div class="form-group">
                                <label for="urlInput">Enter URL:</label>
                                <input type="text" id="urlInput" name="url" class="form-control" placeholder="https://example.com" required>
                            </div>
                            <button type="submit" class="btn btn-primary">Generate QR Code</button>
                        </form>
                        <div class='text-center qr'>
                            ${url ? `<h2>QR Code:</h2><img src="${qrBase64}" alt="QR Code" class="img-fluid">` : ''}
                        </div>
                    </div>
                    <footer class="footer bg-dark text-white text-center py-3">
                        <p class="mb-0">made by Krisztián, 2024 <img width='25px' src='https://ajeetchaulagain.com/static/7cb4af597964b0911fe71cb2f8148d64/87351/express-js.png'> </p>
                    </footer>
                </div>
                <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
                <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
            </body>
            </html>
        `);
    } 
    else {
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>QR Code Generator</title>
                <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
                <style>
                    html, body {
                        height: 100%;
                        margin: 0;
                    }
                    .content-wrapper {
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                    .footer {
                        margin-top: auto;
                    }
                </style>
            </head>
            <body class='bg-dark text-light'>
                <div class="content-wrapper">
                    <div class="container">
                        <h1 class="my-4">Generate QR Code</h1>
                        <form action="/" method="get" class="mb-4">
                            <div class="form-group">
                                <label for="urlInput">Enter URL:</label>
                                <input type="text" id="urlInput" name="url" class="form-control" placeholder="https://example.com" required>
                            </div>
                            <button type="submit" class="btn btn-primary">Generate QR Code</button>
                        </form>
                    </div>
                    <footer class="footer bg-dark text-white text-center py-3">
                        <p class="mb-0">made by Krisztián, 2024 <img width='25px' src='https://ajeetchaulagain.com/static/7cb4af597964b0911fe71cb2f8148d64/87351/express-js.png'> </p>
                    </footer>
                </div>
                <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
                <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
            </body>
            </html>
        `);
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
