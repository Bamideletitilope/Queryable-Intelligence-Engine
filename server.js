require('dotenv').config();

const express = require('express');
const cors = require('cors');
const profileRoute = require('./api/profiles');

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api', profileRoute);

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});