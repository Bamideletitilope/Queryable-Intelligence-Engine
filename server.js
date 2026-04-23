require('dotenv').config();

const express = require('express');
const cors = require('cors');
const profileRoute = require('./api/profiles');

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api', profileRoute);

// health check route (VERY IMPORTANT for deployment debugging)
app.get('/', (req, res) => {
    res.json({
        status: "success",
        message: "Queryable Intelligence Engine is running"
    });
});



const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});