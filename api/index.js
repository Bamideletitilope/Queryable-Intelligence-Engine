const express = require('express');
const serverless = required('serverless-http');
const cors = require('cors');
const profileRoute = require('./profiles');

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api', profileRoute);

//NO app.listen
module.exports.handler = serverless(app);