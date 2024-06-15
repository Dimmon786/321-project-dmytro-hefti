require('dotenv').config();
const { executeSQL } = require('./database');

const seedDatabase = async () => {
  await executeSQL(`INSERT INTO users (name, password) VALUES ('admin', 'adminpassword');`);
  console.log("Database seeded!");
};

seedDatabase();
