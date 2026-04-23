Queryable Intelligence Engine

Overview:
    A demographic intelligence API for Insighta Labs. It evolves as a basic profile data service into a Queryable Intelligence Engine used for demographic analysis.

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

End points
- `GET /api/profiles`: Advanced filtering, sorting, and pagination.
- `GET /api/profiles/search?q=...`: Natural language querying.
- `POST /api/profiles`: Create a new profile.
- `GET /api/profiles/:id`: Get profile by ID.

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