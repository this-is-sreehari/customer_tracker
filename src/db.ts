import * as dotenv from 'dotenv';
import mysql from 'mysql2';
import fs from 'node:fs';


dotenv.config();

// const ca = fs.readFileSync(__dirname + '/certs/ca.pem');  // DEV
const ca = fs.readFileSync('/etc/secrets/ca.pem');  // PROD

// database connection
export const connection = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
    ssl: { ca }
});

connection.connect((err) => {
    if (err) {
      console.error('Error connecting to the database:', err.stack);
      return;
    }
    console.log('Connected to the MySQL database.');
});


export const tableName = "Contact";


export default { connection, tableName };
