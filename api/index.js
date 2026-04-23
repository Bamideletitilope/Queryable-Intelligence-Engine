const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const profileRoute = require('../api/profiles');

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api', profileRoute);

//NO app.listen
module.exports = serverless(app);