import oracledb from 'oracledb';

async function test() {
  console.log('Testing Oracle connection to 192.168.0.131:1521/LACONIC ...');
  try {
    const conn = await oracledb.getConnection({
      user: 'ISSUE_TRACKING',
      password: 'ISSUE_TRACKING',
      connectString: '192.168.0.131:1521/LACONIC',
    });
    console.log('✅ Oracle connection successful!');
    const res = await conn.execute('SELECT 1 FROM DUAL');
    console.log('Query result:', res.rows);
    await conn.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Oracle connection error:', err);
    process.exit(1);
  }
}

test();
