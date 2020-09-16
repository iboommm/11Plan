const express = require('express')
const _ = require('lodash')
const app = express()
const port = 6060
const request = require('request');

app.get('/', (req, res) => {
    res.send('Server is running!')
})

app.get('/livescore/:id', function(req, res) {
    const parm = req.params.id;
    const url = Buffer.from(parm, 'base64').toString();
    const id = _.compact(url.split("/")).reverse()[0];

    request(`https://prod-public-api.livescore.com/v1/api/web/match/soccer/${id}/0`, function(error, response, body) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.parse(body));
    });


});

app.listen(port, () => {})