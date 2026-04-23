
const express = require('express');
const router = express.Router();
const axios = require('axios');
//const cors = require('cors');
const pool = require('../database/db');
const { v4: uuidv4 } = require('uuid');



/*const app = express();
app.use(express.json());
app.use(cors());*/



router.post('/profiles', async (req, res) => {
    try{ 
        const { name } = req.body;

    // Missing name parameter
    if (!name ||typeof name !== 'string') {
        return res.status(422).json({
            status: "error",
            message: "Name must be a string"
        });
    }

    const cleanName = name.trim().toLowerCase();

    if (!cleanName) {
        return res.status(400).json({ 
            status: "error",
            message: "Name is required"
        });
    }
    //IDEMPOTENCY CHECK
    const existing = await pool.query(
    "SELECT * FROM profiles WHERE name = $1",
    [cleanName]
);

if (existing.rows.length > 0) {
    return res.status(200).json({
        status: "success",
        message: "Profile already exists",
        data: existing.rows[0]
    });
}

    const [genderRes, ageRes, countryRes] = await Promise.all([
        axios.get(`https://api.genderize.io/?name=${cleanName}`),
        axios.get(`https://api.agify.io/?name=${cleanName}`),
        axios.get(`https://api.nationalize.io/?name=${cleanName}`)
    ]);

    const { gender, probability, count } = genderRes.data;
    const { age } = ageRes.data;
    const countries = countryRes.data.country;
    //EDGE CASES
        if(!gender ||count === 0) {
            return res.status(422).json({
                status: "error",
                message: "No gender data found"
            });
        }

        if(age === null) {
            return res.status(422).json({
                status: "error",
                message: "No age data found"
            })
        }
        if(!countries || countries.length === 0) {
            return res.status(422).json({
                status: "error",
                message: "No country data found"
            })
        }
        
    //AGE GROUPING
    let age_group;
    if (age <= 12) age_group = "child";
    else if (age <= 19) age_group = "teenager";
    else if (age <= 59) age_group = "adult";
    else age_group = "senior";

    //BEST COUNTRY
    const bestCountry = countries?.reduce((prev, curr) =>
    curr.probability > prev.probability ? curr : prev);

    //simple country mapping
    const countryMap = {
        NG: "Nigeria",
        US: "United States",
        GB: "United Kingdom",
        KE: "Kenya",
        AO: "Angola"
    };

    const country_name = countryMap[bestCountry.country_id] || "Unknown";

    const id = uuidv4();
    const created_at = new Date().toISOString();
    await pool.query(
        `INSERT INTO profiles 
        (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_name,country_probability, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
            id,
            cleanName,
            gender,
            probability,
            count,
            age,
            age_group,
            bestCountry.country_id,
            country_name,
            bestCountry.probability,
            created_at
        ]
    );
    return res.status(201).json({
        status : "success",
        data: {
            id,
            name: cleanName,
            gender,
            gender_probability: probability,
            sample_size: count,
            age,
            age_group,
            country_id: bestCountry.country_id,
            country_probability: bestCountry.probability,
            created_at

        }
    });
    }catch (error) {
        console.error(error);

       return res.status(500).json({
            status: "error",
            message: "Internal server error"
        });
    }

});

//GET ALL PROFILE
router.get('/profiles', async (req, res) => {
    try {
        const { gender, age_group, country_id, min_age, max_age,
            min_gender_probability, min_country_probability, sort_by, order, page = 1, limit = 10
        } = req.query;

        //let query = "SELECT * FROM profiles";
        let conditions = [];
        let values = [];

        /*if (values.length > 0) {
            query += " WHERE " + values.join(" AND");
        }*/

        if (gender) {
            values.push(gender.toLowerCase());
            conditions.push(`LOWER(gender) = $${values.length}`);
        }

        if (age_group) {
            values.push(age_group.toLowerCase());
            conditions.push(`LOWER(age_group) = $${values.length}`);
        }

        if (country_id) {
            values.push(country_id.toUpperCase());
            conditions.push(`UPPER(country_id) = $${values.length}`);
        }

        if (min_age) {
            if (isNaN(min_age)) {
                return res.status(422).json({
                    status: "error",
                    message: "Invalid query parameters"
                })
            }
            values.push(min_age);
            conditions.push(`age >= $${values.length}`);
        }

        if (max_age) {
            if (isNaN(max_age)) {
                return res.status(422).json({
                    status: "error",
                    message: "Invalid query parameters"
                })
            }
            values.push(max_age);
            conditions.push(`age <= $${values.length}`);
        }

        if (min_gender_probability) {
            values.push(Number(min_gender_probability));
            conditions.push(`gender_probability >= $${values.length}`);
        }

        if (min_country_probability) {
            values.push(Number(min_country_probability));
            conditions.push(`country_probability >= $${values.length}`);
        }

        let query = "SELECT * FROM profiles";

        //APPLYING CONDITIONS
        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ")
        }

        //SORTING
        const allowedSort = ["age", "created_at", "gender_probability"];
        const sortField = allowedSort.includes(sort_by) ? sort_by: "created_at";
        const sortOrder = order === "asc" ? "ASC" : "DESC";

        query += ` ORDER BY ${sortField} ${sortOrder}`;

        //PAGINATION
        const pageNum = parseInt(page) || 1;
        const limitNum = Math.min(parseInt(limit) || 10, 50);
        const offset = (pageNum - 1) * limitNum;

        query += ` LIMIT ${limitNum} OFFSET ${offset}`;

        //EXECUTING QUERY
        const result = await pool.query(query, values);

        //TOTAL COUNT(IMPORTANT FOR PAGINATION)
        let countQuery = "SELECT COUNT(*) FROM profiles";
        if (conditions.length > 0) {
            countQuery += " WHERE " + conditions.join(" AND ");
        }

        const countResult = await pool.query(countQuery, values);
        const total = parseInt(countResult.rows[0].count);

        return res.status(200).json({
            status: "success",
            page: pageNum,
            limit: limitNum,
            total,
            data: result.rows
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch profiles"
        });
    }
});

//GET PROFILE BY ID
router.get('/profiles/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "SELECT * FROM profiles WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Profile not found"
            });
        }

        return res.json({
            status: "success",
            data: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            message: "Error fetching profile"
        });
    }
});

//FULL SEARCH ENDPOINT
router.get('/profiles/search', async (req, res) => {
    try {
        const { q, page = 1, limit = 10 } = req.query;
        if (!q || typeof q !== "string") {
            return res. status(400).json({
                status: "error",
                message: "Query is required and must be a string"
            });
        }
        const queryText = q.toLowerCase();

        const values = [];
        const count = [];
        
        // GENDER PARSING
        if (queryText.includes("male")) {
            count.push("male");
            values.push(`(gender) = $${count.length}`);
        }

        if (queryText.includes("female")) {
            count.push("female");
            values.push(`(gender) = $${count.length}`);
        }

        //AGE PARSING  
        if (queryText.includes("child")) {
            count.push("child");
            values.push(`(age_group) = $${count.length}`);
        }
        if (queryText.includes("teenager")) {
            count.push("teenager");
            values.push(`(age_group) = $${count.length}`);
        }
        if (queryText.includes("adult")) {
            count.push("adult");
            values.push(`(age_group) = $${count.length}`);
        }
        if (queryText.includes("senior")) {
            count.push("senior");
            values.push(`(age_group) = $${count.length}`);
        }

        // SPECIAL CASES (YOUNG)
        if (queryText.includes("young")) {
            count.push(16);
            values.push(`(age) >= $${count.length}`);

            values.push(24);
            values.push(`(age) <= $${count.length}`);
        }
        
        //AGE PHRASE PARSING
        const aboveMatch = queryText.match(/above (\d+)/);
        if (aboveMatch) {
            count.push(Number(aboveMatch[1]));
            values.push(`(age) >= $${count.length}`);
        }
        const belowMatch = queryText.match(/below (\d+)/);
        if (belowMatch) {
            count.push(Number(belowMatch[1]));
            values.push(`(age) <= $${count.length}`);
        }

        //COUNTRY PARSING
        const countryMap = {
            nigeria: "NG",
            kenya: "KE",
            angola: "AO",
            ghana: "GH",
            usa: "US",
            "united states": "US",
            uk: "GB",
             "united kingdom": "GB"
    };
    for (const key in countryMap) {
        if (queryText.includes(key)) {
            count.push(countryMap[key]);
            values.push(`(country_id) = $${count.length}`);
        }
    }
    //IF NOTHING MATCHES
    if (values.length === 0) {
        return res.status(404).json({
            status: "error",
            message: "No matching profiles found"
        });
    }

    //CONSTRUCTING QUERY
    let sql = "SELECT * FROM profiles WHERE " + values.join(" AND ");

    //PAGINATION
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 10, 50);
    const offset = (pageNum - 1) * limitNum;

    sql += ` LIMIT ${limitNum} OFFSET ${offset}`;

    const result = await pool.query(sql, count);

    //TOTAL COUNT FOR PAGINATION
    let countSql = "SELECT COUNT(*) FROM profiles WHERE " + values.join(" AND ");
    const countResult = await pool.query(countSql, count);
    const total = parseInt(countResult.rows[0].count);

    return res.status(200).json({
        status: "success",
        page: pageNum,
        limit: limitNum,
        total,
        data: result.rows
    });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            message: "Error performing search"
        });
    }
});

//DELETE PROFILE
router.delete('/profiles/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            "DELETE FROM profiles WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Profile not found"
            });
        }

        return res.json({
            status: "success",
            message: "Profile deleted"
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            message: "Error deleting profile"
        });
    }
});

module.exports = router;







