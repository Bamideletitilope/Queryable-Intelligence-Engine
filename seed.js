require('dotenv').config();
const fs = require('fs');
const pool = require('./database/db');
const { v4: uuidv4 } = require('uuid');


async function seed() {
    try {
        //READ FILE
        const raw = JSON.parse(
            fs.readFileSync('./data/profiles.json', 'utf-8')
        );
        const data = raw.profiles;
        console.log(`Seeding ${data.length} profiles...`);

        const queries = data.map(profile => {
            const {
                name,
                gender,
                gender_probability,
                age,
                age_group,
                country_id,
                country_name,
                country_probability
            } = profile;
            
             return pool.query(
                `INSERT INTO profiles (
                    id, name, gender, gender_probability,
                    age, age_group,
                    country_id, country_name, country_probability,
                    created_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
                ON CONFLICT (name) DO NOTHING`,
                [
                    uuidv4(),
                    name.toLowerCase(),
                    gender,
                    gender_probability,
                    age,
                    age_group,
                    country_id,
                    country_name,
                    country_probability
                ]
            );
        
         }); 
         {
            await Promise.all(queries);
        }

        console.log('Seeding completed!');
        process.exit();

    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seed();

