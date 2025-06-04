import * as dotenv from 'dotenv';
import mysql from 'mysql2';


dotenv.config();

// database connection
const connection = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

connection.connect((err) => {
    if (err) {
      console.error('Error connecting to the database:', err.stack);
      return;
    }
    console.log('Connected to the MySQL database.');
});


// to check if the table exists or create if it doesn't 
export const checkForTable = async (): Promise<void> => {
    
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT COUNT(*) AS table_exists 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'orders'`, 
            (error, results: any) => {
                if (error) return reject(error);
                
                const exists = results[0].table_exists > 0
                if (exists) {
                    console.log('Table already exists');
                    return resolve();
                }

                connection.query(
                    `CREATE TABLE orders (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        phoneNumber VARCHAR(15),
                        email VARCHAR(255),
                        linkedId INT,
                        linkPrecedence ENUM("primary", "secondary") NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                        updated_at TIMESTAMP NULL,
                        deleted_at TIMESTAMP NULL
                    )`,
                    (error, _) => {
                        if (error) return reject(error);
                        console.log('Table "orders" created');
                        return resolve();
                    }
                );
        });
    });
}


// insert the incoming values in the table
export const insertIntoTable = async (email: string, phoneNumber: string): Promise<any> => {

    return new Promise((resolve, reject) => {
        connection.query(
            'INSERT INTO orders (phoneNumber, email) VALUES (?, ?)',
            [phoneNumber, email],
            (error, results) => {
                if (error) return reject(error);
                console.log('Record inserted into table');
                return resolve(results);
            }
        )
    })
}

export default { connection, checkForTable, insertIntoTable };
