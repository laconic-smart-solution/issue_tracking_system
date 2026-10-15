import { v4 as uuidv4 } from 'uuid';
import { query } from './db';

async function seed() {
  console.log('[Oracle] Seeding initial data (ERP Modules, Sample Companies, Support Agents)...');

  try {
    // 1. ERP Modules
    const modules = [
      { name: 'Financial & Accounting (GL/AP/AR)', code: 'ACC', desc: 'General ledger, payments, invoices, tax' },
      { name: 'Inventory & Warehouse Management', code: 'INV', desc: 'Stock valuation, transfers, item master' },
      { name: 'Sales & Distribution', code: 'SALES', desc: 'Quotations, sales orders, delivery orders' },
      { name: 'Purchasing & Procurement', code: 'PUR', desc: 'Purchase requests, purchase orders, vendor bills' },
      { name: 'Point of Sale (POS)', code: 'POS', desc: 'Cashier terminals, daily closing, sync issues' },
      { name: 'HR & Payroll', code: 'HR', desc: 'Attendance, payroll generation, employee master' },
    ];

    for (const m of modules) {
      const check = await query('SELECT id FROM erp_modules WHERE code = $1', [m.code]);
      if (check.rows.length === 0) {
        await query(
          'INSERT INTO erp_modules (id, name, code, description) VALUES ($1, $2, $3, $4)',
          [uuidv4(), m.name, m.code, m.desc]
        );
        console.log(`✅ [Oracle] Seeded module: ${m.name}`);
      }
    }

    // 2. Sample Customer Companies
    const sampleCompanies = [
      { name: 'Alpha Retail Group', code: 'ALPHA', contract: 'Premium' },
      { name: 'Apex Manufacturing Co., Ltd', code: 'APEX', contract: 'Standard' },
      { name: 'Golden Land Distribution', code: 'GLD', contract: 'Premium' },
    ];

    for (const c of sampleCompanies) {
      const check = await query('SELECT id FROM companies WHERE code = $1', [c.code]);
      if (check.rows.length === 0) {
        await query(
          'INSERT INTO companies (id, name, code, contract_type, is_active) VALUES ($1, $2, $3, $4, 1)',
          [uuidv4(), c.name, c.code, c.contract]
        );
        console.log(`✅ [Oracle] Seeded company: ${c.name}`);
      }
    }

    // 3. Sample Support Agents
    const sampleUsers = [
      { name: 'Admin Lead', email: 'admin@itsupport.local', password: 'password123', role: 'ADMIN' },
      { name: 'Ko Min (Financial ERP)', email: 'komin@itsupport.local', password: 'password123', role: 'AGENT' },
      { name: 'Ma Thidar (Logistics ERP)', email: 'thidar@itsupport.local', password: 'password123', role: 'AGENT' },
    ];

    for (const u of sampleUsers) {
      const check = await query('SELECT id FROM users WHERE email = $1', [u.email]);
      if (check.rows.length === 0) {
        await query(
          'INSERT INTO users (id, name, email, password_hash, role, is_online, active_ticket_count) VALUES ($1, $2, $3, $4, $5, 1, 0)',
          [uuidv4(), u.name, u.email, u.password, u.role]
        );
        console.log(`✅ [Oracle] Seeded user: ${u.name}`);
      }
    }

    console.log('🎉 [Oracle] Seeding finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ [Oracle] Error seeding data:', error);
    process.exit(1);
  }
}

seed();
