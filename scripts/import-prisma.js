/**
 * Database Importer for Tashgheel POS
 * Imports MongoDB JSON files exported via scripts/export-mongo.js
 * into PostgreSQL using Prisma Client, maintaining tenant relationships.
 * 
 * Usage:
 *   node scripts/import-prisma.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ Error: DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const exportDir = path.join(__dirname, '../db-export');

// Helper to parse dates gracefully
function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// Helper to load JSON files safely
function loadJsonFile(fileName) {
  const filePath = path.join(exportDir, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Warning: Export file not found at ${filePath}. Skipping.`);
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Error parsing JSON file ${filePath}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting Database Migration to PostgreSQL...');
  console.log(`Reading exports from: ${exportDir}`);

  // Test Database Connection
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL via Prisma Client.\n');
  } catch (connectionError) {
    console.error('❌ Failed to connect to PostgreSQL database:', connectionError.message);
    process.exit(1);
  }

  // 1. IMPORT TENANTS
  console.log('📦 Phase 1: Importing Tenants...');
  const tenantsData = loadJsonFile('tenants.json');
  const existingTenantIds = new Set();

  if (tenantsData) {
    let successCount = 0;
    for (const item of tenantsData) {
      const id = item._id || item.id;
      if (!id) {
        console.warn('⚠️ Found tenant without ID, skipping:', item);
        continue;
      }
      try {
        const payload = {
          id,
          businessName: item.businessName || 'Unnamed Business',
          email: item.email,
          phone: item.phone || '',
          trialEndsAt: parseDate(item.trialEndsAt) || new Date(),
          subscriptionEndsAt: parseDate(item.subscriptionEndsAt),
          isSubscribed: !!item.isSubscribed,
          status: item.status || 'active',
          subscriptionPlan: item.subscriptionPlan || 'free_trial',
          createdAt: parseDate(item.createdAt) || new Date(),
          settings: item.settings || {},
        };

        await prisma.tenant.upsert({
          where: { id },
          update: payload,
          create: payload,
        });

        existingTenantIds.add(id);
        successCount++;
      } catch (err) {
        console.error(`❌ Error importing Tenant ID ${id}:`, err.message);
      }
    }
    console.log(`✅ Tenants finished. Successfully imported/updated ${successCount}/${tenantsData.length} records.\n`);
  } else {
    console.log('ℹ️ No tenants data found. Querying existing tenants in Postgres...');
    const dbTenants = await prisma.tenant.findMany({ select: { id: true } });
    dbTenants.forEach(t => existingTenantIds.add(t.id));
  }

  if (existingTenantIds.size === 0) {
    console.error('❌ Error: No tenants exist in the target database. You must import or create at least one Tenant first.');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Helper to validate tenant existence for dependent tables
  function checkTenant(item, collectionName) {
    const id = item._id || item.id;
    if (!item.tenantId) {
      console.warn(`⚠️ Skipped item ID ${id} in ${collectionName}: Missing tenantId`);
      return false;
    }
    if (!existingTenantIds.has(item.tenantId)) {
      console.warn(`⚠️ Skipped item ID ${id} in ${collectionName}: Tenant ID ${item.tenantId} does not exist.`);
      return false;
    }
    return true;
  }

  // 2. IMPORT CATEGORIES
  console.log('📦 Phase 2: Importing Categories...');
  const categoriesData = loadJsonFile('categories.json');
  if (categoriesData) {
    let successCount = 0;
    for (const item of categoriesData) {
      if (!checkTenant(item, 'Categories')) continue;
      const id = item._id || item.id;
      try {
        const payload = {
          id,
          tenantId: item.tenantId,
          name: item.name,
          nameEn: item.nameEn || null,
          createdAt: parseDate(item.createdAt) || new Date(),
        };
        await prisma.category.upsert({
          where: { id },
          update: payload,
          create: payload,
        });
        successCount++;
      } catch (err) {
        console.error(`❌ Error Category ID ${id}:`, err.message);
      }
    }
    console.log(`✅ Categories finished: ${successCount}/${categoriesData.length}\n`);
  }

  // 3. IMPORT CUSTOMERS
  console.log('📦 Phase 3: Importing Customers...');
  const customersData = loadJsonFile('customers.json');
  if (customersData) {
    let successCount = 0;
    for (const item of customersData) {
      if (!checkTenant(item, 'Customers')) continue;
      const id = item._id || item.id;
      try {
        const payload = {
          id,
          tenantId: item.tenantId,
          name: item.name,
          phone: item.phone,
          email: item.email || null,
          address: item.address || null,
          loyaltyPoints: Number(item.loyaltyPoints || 0),
          createdAt: parseDate(item.createdAt) || new Date(),
        };
        await prisma.customer.upsert({
          where: { id },
          update: payload,
          create: payload,
        });
        successCount++;
      } catch (err) {
        console.error(`❌ Error Customer ID ${id}:`, err.message);
      }
    }
    console.log(`✅ Customers finished: ${successCount}/${customersData.length}\n`);
  }

  // 4. IMPORT SALESMEN
  console.log('📦 Phase 4: Importing Salesmen...');
  const salesmenData = loadJsonFile('salesmen.json');
  if (salesmenData) {
    let successCount = 0;
    for (const item of salesmenData) {
      if (!checkTenant(item, 'Salesmen')) continue;
      const id = item._id || item.id;
      try {
        const payload = {
          id,
          tenantId: item.tenantId,
          name: item.name,
          targets: item.targets || [],
        };
        await prisma.salesman.upsert({
          where: { id },
          update: payload,
          create: payload,
        });
        successCount++;
      } catch (err) {
        console.error(`❌ Error Salesman ID ${id}:`, err.message);
      }
    }
    console.log(`✅ Salesmen finished: ${successCount}/${salesmenData.length}\n`);
  }

  // 5. IMPORT PRODUCTS
  console.log('📦 Phase 5: Importing Products...');
  const productsData = loadJsonFile('products.json');
  if (productsData) {
    let successCount = 0;
    for (const item of productsData) {
      if (!checkTenant(item, 'Products')) continue;
      const id = item._id || item.id;
      try {
        const payload = {
          id,
          tenantId: item.tenantId,
          name: item.name,
          nameEn: item.nameEn || null,
          barcode: item.barcode || null,
          price: Number(item.price || 0),
          cost: Number(item.cost || 0),
          stock: Number(item.stock || 0),
          minStock: Number(item.minStock || 0),
          trackStock: item.trackStock !== false,
          category: item.category || null,
          categoryEn: item.categoryEn || null,
          isActive: item.isActive !== false,
          createdAt: parseDate(item.createdAt) || new Date(),
        };
        await prisma.product.upsert({
          where: { id },
          update: payload,
          create: payload,
        });
        successCount++;
      } catch (err) {
        console.error(`❌ Error Product ID ${id}:`, err.message);
      }
    }
    console.log(`✅ Products finished: ${successCount}/${productsData.length}\n`);
  }

  // 6. IMPORT SHIFTS
  console.log('📦 Phase 6: Importing Shifts...');
  const shiftsData = loadJsonFile('shifts.json');
  const existingShiftIds = new Set();

  if (shiftsData) {
    let successCount = 0;
    for (const item of shiftsData) {
      if (!checkTenant(item, 'Shifts')) continue;
      const id = item._id || item.id;
      try {
        const payload = {
          id,
          tenantId: item.tenantId,
          cashier: item.cashier,
          startTime: parseDate(item.startTime) || new Date(),
          endTime: parseDate(item.endTime),
          startCash: Number(item.startCash || 0),
          endCash: item.endCash != null ? Number(item.endCash) : null,
          actualCash: item.actualCash != null ? Number(item.actualCash) : null,
          actualCard: item.actualCard != null ? Number(item.actualCard) : null,
          actualMobile: item.actualMobile != null ? Number(item.actualMobile) : null,
          totalSales: Number(item.totalSales || 0),
          cashSales: Number(item.cashSales || 0),
          cardSales: Number(item.cardSales || 0),
          mobileSales: Number(item.mobileSales || 0),
          returnsTotal: Number(item.returnsTotal || 0),
          expensesTotal: Number(item.expensesTotal || 0),
          categorySales: item.categorySales || {},
          cancelledTotal: Number(item.cancelledTotal || 0),
          status: item.status || 'open',
          transactions: item.transactions || [],
        };
        await prisma.shift.upsert({
          where: { id },
          update: payload,
          create: payload,
        });
        existingShiftIds.add(id);
        successCount++;
      } catch (err) {
        console.error(`❌ Error Shift ID ${id}:`, err.message);
      }
    }
    console.log(`✅ Shifts finished. Successfully imported/updated ${successCount}/${shiftsData.length} records.\n`);
  } else {
    const dbShifts = await prisma.shift.findMany({ select: { id: true } });
    dbShifts.forEach(s => existingShiftIds.add(s.id));
  }

  // 7. IMPORT USERS
  console.log('📦 Phase 7: Importing Users...');
  const usersData = loadJsonFile('users.json');
  if (usersData) {
    let successCount = 0;
    for (const item of usersData) {
      if (!checkTenant(item, 'Users')) continue;
      const id = item._id || item.id;
      try {
        const payload = {
          id,
          tenantId: item.tenantId,
          username: item.username,
          passwordHash: item.passwordHash,
          role: item.role || 'cashier',
          fullName: item.fullName,
          active: item.active !== false,
          permissions: item.permissions || {},
          createdAt: parseDate(item.createdAt) || new Date(),
        };
        await prisma.user.upsert({
          where: { id },
          update: payload,
          create: payload,
        });
        successCount++;
      } catch (err) {
        console.error(`❌ Error User ID ${id}:`, err.message);
      }
    }
    console.log(`✅ Users finished: ${successCount}/${usersData.length}\n`);
  }

  // 8. IMPORT EXPENSES
  console.log('📦 Phase 8: Importing Expenses...');
  const expensesData = loadJsonFile('expenses.json');
  if (expensesData) {
    let successCount = 0;
    for (const item of expensesData) {
      if (!checkTenant(item, 'Expenses')) continue;
      const id = item._id || item.id;
      try {
        const payload = {
          id,
          tenantId: item.tenantId,
          date: item.date || new Date().toISOString().split('T')[0],
          seller: item.seller || null,
          description: item.description,
          amount: Number(item.amount || 0),
          method: item.method || 'cash',
        };
        await prisma.expense.upsert({
          where: { id },
          update: payload,
          create: payload,
        });
        successCount++;
      } catch (err) {
        console.error(`❌ Error Expense ID ${id}:`, err.message);
      }
    }
    console.log(`✅ Expenses finished: ${successCount}/${expensesData.length}\n`);
  }

  // 9. IMPORT SALES (Must check shift relation to prevent foreign key errors)
  console.log('📦 Phase 9: Importing Sales...');
  const salesData = loadJsonFile('sales.json');
  if (salesData) {
    let successCount = 0;
    for (const item of salesData) {
      if (!checkTenant(item, 'Sales')) continue;
      const id = item._id || item.id;
      try {
        // Resolve Shift connection. If the shiftId referenced doesn't exist, disconnect it
        let finalShiftId = item.shiftId;
        if (finalShiftId && !existingShiftIds.has(finalShiftId)) {
          console.warn(`⚠️ Sale ${id} referenced nonexistent Shift ${finalShiftId}. Setting shiftId: null to avoid DB crash.`);
          finalShiftId = null;
        }

        const payload = {
          id,
          tenantId: item.tenantId,
          receiptId: item.receiptId,
          shiftId: finalShiftId || null,
          date: parseDate(item.date) || new Date(),
          method: item.method || 'cash',
          splitPayments: item.splitPayments || [],
          cashier: item.cashier || 'System',
          salesman: item.salesman || null,
          total: Number(item.total || 0),
          taxAmount: Number(item.taxAmount || 0),
          taxName: item.taxName || null,
          taxRate: item.taxRate != null ? Number(item.taxRate) : null,
          items: item.items || [],
          status: item.status || 'finished',
          returns: item.returns || [],
          returnReason: item.returnReason || null,
        };

        await prisma.sale.upsert({
          where: { id },
          update: payload,
          create: payload,
        });
        successCount++;
      } catch (err) {
        console.error(`❌ Error Sale ID ${id}:`, err.message);
      }
    }
    console.log(`✅ Sales finished: ${successCount}/${salesData.length}\n`);
  }

  // 10. IMPORT STOCK ADJUSTMENTS
  console.log('📦 Phase 10: Importing Stock Adjustments...');
  const adjustmentsData = loadJsonFile('stockadjustments.json');
  if (adjustmentsData) {
    let successCount = 0;
    for (const item of adjustmentsData) {
      if (!checkTenant(item, 'StockAdjustments')) continue;
      const id = item._id || item.id;
      try {
        const payload = {
          id,
          tenantId: item.tenantId,
          date: parseDate(item.date) || new Date(),
          adjustedBy: item.adjustedBy || 'System',
          items: item.items || [],
        };
        await prisma.stockAdjustment.upsert({
          where: { id },
          update: payload,
          create: payload,
        });
        successCount++;
      } catch (err) {
        console.error(`❌ Error StockAdjustment ID ${id}:`, err.message);
      }
    }
    console.log(`✅ Stock Adjustments finished: ${successCount}/${adjustmentsData.length}\n`);
  }

  // 11. IMPORT AUDIT LOGS
  console.log('📦 Phase 11: Importing Audit Logs...');
  const auditLogsData = loadJsonFile('auditlogs.json');
  if (auditLogsData) {
    let successCount = 0;
    for (const item of auditLogsData) {
      if (!checkTenant(item, 'AuditLogs')) continue;
      const id = item._id || item.id;
      try {
        const payload = {
          id,
          tenantId: item.tenantId,
          user: item.user || 'System',
          action: item.action || 'UNKNOWN',
          details: item.details || {},
          timestamp: parseDate(item.timestamp) || new Date(),
        };
        await prisma.auditLog.upsert({
          where: { id },
          update: payload,
          create: payload,
        });
        successCount++;
      } catch (err) {
        console.error(`❌ Error AuditLog ID ${id}:`, err.message);
      }
    }
    console.log(`✅ Audit Logs finished: ${successCount}/${auditLogsData.length}\n`);
  }

  console.log('🎉 DATABASE MIGRATION SCRIPT RUN COMPLETED SUCCESSFULLY! 🎉');
  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (err) => {
  console.error('❌ Critical error in importer:', err);
  await prisma.$disconnect();
  try {
    await pool.end();
  } catch (poolErr) {
    // Ignore pool closing errors
  }
  process.exit(1);
});
