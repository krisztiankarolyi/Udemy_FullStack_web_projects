/* 
1. Use the inquirer npm package to get user input.
2. Use the qr-image npm package to turn the user entered URL into a QR code image.
3. Create a txt file to save the user input using the native fs node module.
*/
import inquirer from 'inquirer';
import qr from 'qr-image';
import fs from 'fs';

inquirer.prompt([
    {
        name: 'url',
        message: 'Please type here the URL'
    }
  ])
  .then(function(answers){
    let url = answers.url
    var qr_png = qr.image(url, { type: 'png' });
    qr_png.pipe(fs.createWriteStream('user_qr.png'));

    fs.writeFile("URL.txt", url,(err) => {
        if(err) console.log(err);
    });
   })
  .catch((error) => {
    console.log(error.message);
  });

