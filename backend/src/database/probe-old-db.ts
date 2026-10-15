import mysql from 'mysql2/promise';
import oracledb from 'oracledb';

async function testMysql() {
  console.log('--- Probing MySQL on 192.168.0.118:3306 ---');
  const attempts = [
    { user: 'root', password: '' },
    { user: 'root', password: 'password' },
    { user: 'root', password: 'root' },
    { user: 'root', password: '123' },
    { user: 'ISSUE_TRACKING', password: 'ISSUE_TRACKING' },
  ];

  for (const a of attempts) {
    try {
      const conn = await mysql.createConnection({
        host: '192.168.0.118',
        port: 3306,
        user: a.user,
        password: a.password,
        connectTimeout: 3000,
      });
      console.log(`✅ MySQL Connected with user: '${a.user}' (password: '${a.password}')`);
      const [rows] = await conn.execute('SHOW DATABASES');
      console.log('Databases:', rows);
      await conn.end();
      return true;
    } catch (e: any) {
      console.log(`MySQL attempt (${a.user}):`, e.message);
    }
  }
  return false;
}

async function testOracle() {
  console.log('--- Probing Oracle on 192.168.0.118:1521 ---');
  try {
    const conn = await oracledb.getConnection({
      user: 'ISSUE_TRACKING',
      password: 'ISSUE_TRACKING',
      connectString: '192.168.0.118:1521/LACONIC',
    });
    console.log('✅ Oracle Connected to 192.168.0.118:1521/LACONIC');
    const res = await conn.execute('SELECT table_name FROM user_tables WHERE ROWNUM <= 15');
    console.log('Tables:', res.rows);
    await conn.close();
    return true;
  } catch (e: any) {
    console.log('Oracle attempt:', e.message);
    return false;
  }
}

async function main() {
  await testMysql();
  await testOracle();
  process.exit(0);
}

main();
