const { Client } = require('pg');

const passwords = ['', 'postgres', 'admin', 'root', 'Kiddos@2024', 'Kiddos@2025'];
const users = ['postgres', 'postgres'];

async function testConnections() {
  for (const user of users) {
    for (const password of passwords) {
      const connectionString = `postgresql://${user}:${password}@localhost:5432/postgres`;
      console.log(`Testing: ${connectionString.replace(password, '****')}`);
      const client = new Client({ connectionString });
      try {
        await client.connect();
        console.log(`SUCCESS! Connected with: ${connectionString}`);
        await client.end();
        return connectionString;
      } catch (err) {
        console.log(`Failed: ${err.message}`);
      }
    }
  }
  console.log('No connection succeeded.');
  return null;
}

testConnections();
