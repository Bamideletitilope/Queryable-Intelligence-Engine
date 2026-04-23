Queryable Intelligence Engine

Overview:
    This project is a backend API built as part of the HNG Internship. It evolves a basic profile data service into a Queryable Intelligence Engine used for demographic analysis.

The system:
    Collects user profile data from external APIs
    Stores structured data in a PostgreSQL database
    Supports advanced querying, filtering, sorting, and pagination
    Interprets natural language queries into structured filters

Tech Stack
    Node.js
    Express.js
    PostgreSQL (Supabase / Railway)
    Axios
    UUID

Data Seeding
    The database is seeded with 2026 profiles.

Idempotency
    Duplicate name submissions return existing record.
    No duplicate database entries

Performance
    Indexed columns:
        gender
        age
        country_id
    Efficient filtering and pagination
    Avoids full table scans

Author
Bamidele Titilope