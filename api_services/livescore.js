const express = require('express')
let https = require('https');
const _ = require('lodash')
const fs = require('fs')
const app = express()
const port = 6060
const request = require('request');

app.get('/', (req, res) => {
    res.send('Server is running!')
})


var https_options = {
    key: fs.readFileSync("/home/admin/conf/web/ssl.iboommm.com.key"),
    cert: fs.readFileSync("/home/admin/conf/web/ssl.iboommm.com.crt")
};


app.get('/livescore/:id', function(req, res) {
    const parm = req.params.id;
    const url = Buffer.from(parm, 'base64').toString();
    const id = _.compact(url.split("/")).reverse()[0];

    request(`https://prod-public-api.livescore.com/v1/api/web/match/soccer/${id}/0`, function(error, response, body) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", '*');
        res.send(JSON.parse(body));
    });
});

var server = https.createServer(https_options, app);

server.listen(port, () => {})