/**
 * Database Exporter for Tashgheel POS
 * Exports all 11 MongoDB collections into clean, standardized JSON files
 * to facilitate migration to PostgreSQL.
 * 
 * Usage:
 *   node scripts/export-mongo.js
 *   node scripts/export-mongo.js "mongodb://username:password@localhost:27017/tashgheel-pos"
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables from possible locations
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

// Import Models
const AuditLog = require('../server/models/AuditLog');
const Category = require('../server/models/Category');
const Customer = require('../server/models/Customer');
const Expense = require('../server/models/Expense');
const Product = require('../server/models/Product');
const Sale = require('../server/models/Sale');
const Salesman = require('../server/models/Salesman');
const Shift = require('../server/models/Shift');
const StockAdjustment = require('../server/models/StockAdjustment');
const Tenant = require('../server/models/Tenant');
const User = require('../server/models/User');

const models = {
  Tenants: Tenant,
  Users: User,
  Products: Product,
  Categories: Category,
  Salesmen: Salesman,
  Expenses: Expense,
  Sales: Sale,
  Shifts: Shift,
  StockAdjustments: StockAdjustment,
  Customers: Customer,
  AuditLogs: AuditLog
};

async function main() {
  // 1. Resolve MongoDB URI
  let mongoUri = process.argv[2] || process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Error: MONGO_URI is not defined.');
    console.log('\nPlease provide the MongoDB connection URI either:');
    console.log('1. As an argument: node scripts/export-mongo.js "mongodb+srv://..."');
    console.log('2. In a .env file: MONGO_URI=mongodb://localhost:27017/tashgheel-pos\n');
    process.exit(1);
  }

  console.log('\x1b[36m%s\x1b[0m', '🚀 Connecting to MongoDB...');
  console.log(`Connection URI: ${mongoUri.replace(/:([^@]+)@/, ':****@')}`); // Hide credentials in output

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('\x1b[32m%s\x1b[0m', '✅ Connected to MongoDB successfully.\n');
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', '❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }

  // 2. Prepare Export Folder
  const exportDir = path.join(__dirname, '../db-export');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  console.log('\x1b[36m%s\x1b[0m', '📦 Exporting collections...');
  const summary = [];
  const fullBackup = {};

  // 3. Query and export each collection
  for (const [name, model] of Object.entries(models)) {
    try {
      console.log(`- Fetching ${name}...`);
      // Use lean() for performance and clean JS objects
      const data = await model.find().lean();
      
      // Clean Mongoose/BSON specific types so they serialize beautifully
      const cleanData = JSON.parse(JSON.stringify(data, (key, value) => {
        // If it's a MongoDB ObjectId, convert to string
        if (value && typeof value === 'object' && value.$oid) {
          return value.$oid;
        }
        // Normalize maps and subdocuments
        return value;
      }));

      // Write individual file
      const fileName = `${name.toLowerCase()}.json`;
      const filePath = path.join(exportDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(cleanData, null, 2), 'utf8');

      summary.push({ Collection: name, File: fileName, Count: cleanData.length });
      fullBackup[name] = cleanData;
    } catch (modelError) {
      console.error('\x1b[31m%s\x1b[0m', `❌ Failed to export ${name}:`, modelError.message);
      summary.push({ Collection: name, File: 'FAILED', Count: 0 });
    }
  }

  // Write unified full export file
  try {
    const combinedPath = path.join(exportDir, 'full_db_export.json');
    fs.writeFileSync(combinedPath, JSON.stringify(fullBackup, null, 2), 'utf8');
    console.log('\n\x1b[32m%s\x1b[0m', `✅ Unified export created: db-export/full_db_export.json`);
  } catch (combinedError) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Failed to create unified export file:', combinedError.message);
  }

  // 4. Output Summary Table
  console.log('\n\x1b[35m%s\x1b[0m', '📊 EXPORT SUMMARY:');
  console.table(summary);

  console.log('\n\x1b[32m%s\x1b[0m', '✨ ALL DATA EXPORTED SUCCESSFULLY! ✨');
  console.log(`Files are stored in: ${exportDir}`);
  console.log('\n\x1b[36m%s\x1b[0m', '💡 Migration Guidance to PostgreSQL:');
  console.log('1. All MongoDB ObjectIds have been converted to standard hex strings.');
  console.log('2. Nested subdocuments (like settings in Tenants, or items in Sales) can be stored in PostgreSQL as `JSONB` data types.');
  console.log('3. References (like tenantId in User) can be set as Foreign Keys once tables are populated.');
  console.log('4. Ensure that table insertion orders respect foreign keys: insert Tenants first, then Users/Products, then Sales/Shifts.\n');

  // Disconnect from MongoDB
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error in exporter:', err);
  process.exit(1);
});
