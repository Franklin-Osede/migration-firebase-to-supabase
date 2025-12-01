Firebase to Supabase Migration
A comprehensive migration toolkit for transitioning from Firebase (Realtime Database / Firestore + Authentication) to Supabase (PostgreSQL + Supabase Auth). This repository provides production-ready scripts, schemas, and documentation for executing a complete database migration with minimal downtime.

Overview
This project implements a complete migration strategy from Firebase to Supabase, addressing key challenges including schema transformation, data consistency, user account migration, security rules mapping, and incremental cutover strategies.

The migration includes 35 relational tables, 57 strategic indexes, Row Level Security (RLS) policies, and 4 storage buckets, all optimized for production use in a financial application context.

Features
Complete schema migration from NoSQL to relational database structure
Row Level Security (RLS) implementation across all tables
User authentication migration support
Data integrity validation and verification tools
Incremental migration capabilities with batch processing
Storage bucket migration for files and assets
Comprehensive audit logging and soft delete patterns
Performance optimizations with strategic indexing
Project Structure
.
├── scripts/              # Migration and utility scripts
│   ├── create-tables-with-rls.js    # Main table creation with RLS
│   ├── migrate.js                   # Data migration from Firebase
│   ├── verify-simple.js             # Database verification
│   ├── validate-schema.js           # Schema validation
│   └── ...
├── src/
│   └── config/
│       └── database.js              # Database configuration
├── config.env                      # Environment configuration (not versioned)
├── env.example                     # Environment template
└── package.json                    # Dependencies and scripts
Prerequisites
Node.js v18 or higher
npm or yarn
Supabase project with Service Role Key
Firebase Admin SDK credentials
Access to both Firebase and Supabase projects
Installation
# Clone the repository
git clone <repository-url>
cd migration-firebase-supabase

# Install dependencies
npm install

# Copy environment template
cp env.example config.env

# Configure your environment variables in config.env
Configuration
Configure the following environment variables in config.env:

Firebase Configuration:

FIREBASE_PROJECT_ID
FIREBASE_PRIVATE_KEY
FIREBASE_CLIENT_EMAIL
Additional Firebase Admin SDK credentials
Supabase Configuration:

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
Migration Settings:

BATCH_SIZE - Records per batch (default: 1000)
DELAY_BETWEEN_BATCHES - Delay in milliseconds (default: 1000)
LOG_LEVEL - Logging level (default: info)
Usage
Database Schema Creation
Create all tables with Row Level Security:

npm run create:tables:rls
Create basic tables without RLS (for testing):

npm run create:tables:simple
Configure RLS on existing tables:

npm run configure:rls
Verification and Diagnostics
Verify database state:

npm run verify:simple
Diagnose connection issues:

npm run diagnose
Schema Inspection
List all tables:

npm run schema:sql:list
View specific table schema:

npm run schema:sql users
npm run schema:sql investments
View table columns:

npm run columns:list
npm run columns:show users
Validation
Validate complete schema:

npm run validate:schema
General validation:

npm run validate
Data Migration
Migrate data from Firebase to Supabase:

npm run migrate
Database Schema
The migration includes 35 tables organized into the following categories:

User Management:

users - Primary user accounts
user_profiles - Extended user profiles
two_factor_auth - Two-factor authentication
Investments:

investments - Investment projects
user_investments - User-investment relationships
investors - Investor information
Transactions:

transactions_mangopay - MangoPay transactions
transactions_blockchain - Blockchain transactions
bank_transfers - Bank transfer records
Reserves and Dividends:

reserves_mangopay - MangoPay reserves
dividends - Dividend records
dividend_claims - Dividend claims
Wallets:

wallets - Digital wallets
wallet_transactions - Wallet transactions
wallet_balances - Wallet balances
Documents and KYC:

kyc_verifications - KYC verification records
documents - User documents
fiscal_documents - Fiscal documents
Security and Audit:

roles - Role definitions
permissions - Permission definitions
role_assignments - Role assignments
audit_logs - Audit trail
System Configuration:

system_config - System configuration
cache_data - Cache storage
countries - Country reference data
Additional reference tables
For complete table documentation, see TABLAS-COMPLETAS.md.

Storage Buckets
The migration includes 4 storage buckets:

project-images - Investment project images
user-documents - User documents (KYC, fiscal)
profile-pictures - User profile pictures
system-assets - System resources (logos, icons)
Security
All tables implement Row Level Security (RLS) with policies for:

User data isolation (users can only access their own data)
Public data access (reference data accessible to all)
Administrative access (admin-only operations)
Security policies are automatically configured during table creation.

Performance Optimizations
The schema includes:

57 strategic indexes for common query patterns
Composite indexes for complex joins
Partial indexes for filtered queries
Optimized UUID generation
Automatic timestamp management via triggers
Soft delete patterns with audit trails
Environment-Specific Operations
Work with different environments:

# Development environment
npm run setup:dev
npm run create:dev
npm run verify:dev
npm run schema:dev

# Production environment
npm run setup:prod
npm run create:prod
npm run verify:prod
npm run schema:prod
Permissions Required
Service Role Key: Required for database operations, table creation, and data migration.

Owner Permissions: Required for complete Storage RLS configuration (some operations may require dashboard access).

Current Status
35 tables created and verified
57 strategic indexes implemented
RLS enabled on all tables
Security policies configured
4 storage buckets created
Zero critical errors
The database is production-ready.

Documentation
TABLAS-COMPLETAS.md - Complete table documentation with column details
ARCHIVOS-EXPLICACION.md - File structure and script explanations
COMANDOS-DISPONIBLES.md - Complete command reference
Migration Strategy
This toolkit supports multiple migration approaches:

Full Migration: Complete schema and data migration in one operation
Incremental Migration: Batch-based migration with progress tracking
Hybrid Mode: Gradual cutover with dual-write support (requires application-level changes)
Best Practices
Always verify connection before migration: npm run diagnose
Validate schema after creation: npm run validate:schema
Test with simple tables first: npm run create:tables:simple
Use batch processing for large datasets
Monitor migration progress and handle errors gracefully
Perform data integrity checks post-migration
Troubleshooting
Connection Issues:

npm run diagnose
Table Creation Errors: Check Service Role Key permissions and Supabase project settings.

Migration Errors: Review batch size and delay settings. Increase DELAY_BETWEEN_BATCHES for rate-limited APIs.

RLS Configuration: Some Storage RLS policies may require manual configuration in the Supabase dashboard.

License
MIT

Author
Franklin Osede Prieto

Contributing
This is a private repository. For contributions or questions, please contact the project maintainers.
