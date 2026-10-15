import http from 'http';
import https from 'https';

async function fetchHttp(urlStr: string): Promise<string> {
  return new Promise((resolve) => {
    http.get(urlStr, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', (err) => resolve(`ERROR: ${err.message}`));
  });
}

async function fetchHttps(host: string, port: number, path: string): Promise<string> {
  return new Promise((resolve) => {
    const req = https.request({
      host,
      port,
      path,
      rejectUnauthorized: false,
      timeout: 5000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(`STATUS ${res.statusCode}: ${data}`));
    });
    req.on('error', (err) => resolve(`ERROR: ${err.message}`));
    req.end();
  });
}

async function main() {
  console.log('--- 1. Checking DokuWiki Content for Mantis Links ---');
  const dokuIndex = await fetchHttp('http://192.168.0.118:8081/dokuwiki/doku.php?do=index');
  const dokuStart = await fetchHttp('http://192.168.0.118:8081/dokuwiki/doku.php?id=start');
  
  const allText = dokuIndex + dokuStart;
  const matches = allText.match(/href="([^"]+)"/g) || [];
  console.log('Total Links in DokuWiki:', matches.length);
  
  const mantisLinks = matches.filter(l => l.toLowerCase().includes('mantis') || l.toLowerCase().includes('bug') || l.toLowerCase().includes('issue'));
  console.log('Mantis / Issue related links found in Wiki:');
  console.log(mantisLinks);

  // Print all external / internal links
  const distinctLinks = [...new Set(matches.map(m => m.replace('href=', '').replace(/"/g, '')))];
  console.log('Sample links in Wiki:', distinctLinks.slice(0, 20));

  console.log('\n--- 2. Checking HTTPS 443 ---');
  const httpsRes = await fetchHttps('192.168.0.118', 443, '/');
  console.log('HTTPS 443 snippet:', httpsRes.slice(0, 300));

  console.log('\n--- 3. Probing Mantis on 8081 with common variations ---');
  const candidates = [
    '/mantis/',
    '/mantisbt/',
    '/mantis-1.2/',
    '/mantis-2.0/',
    '/mantisbt-1.2.19/',
    '/mantisbt-2.0.0/',
    '/MantisBT/',
    '/Mantis/',
    '/bugtracker/',
    '/bugs/',
    '/issue/',
    '/issues/',
    '/bts/',
    '/it/',
    '/support/',
    '/helpdesk/'
  ];

  for (const c of candidates) {
    const res = await fetchHttp(`http://192.168.0.118:8081${c}`);
    if (!res.includes('404 Not Found') && !res.startsWith('ERROR')) {
      console.log(`✅ FOUND on 8081: ${c}`);
      const title = res.match(/<title>(.*?)<\/title>/i);
      console.log(`   Title: ${title ? title[1] : 'No title'}`);
    }
  }

  process.exit(0);
}

main();
