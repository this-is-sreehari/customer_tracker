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


const tableName = "Contact";

// to check if the table exists or create if it doesn't 
export const checkForTable = async (): Promise<void> => {
    
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT COUNT(*) AS table_exists 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = '${tableName}'`, 
            (error, results: any) => {
                if (error) return reject(error);
                
                const exists = results[0].table_exists > 0
                if (exists) {
                    console.log('Table already exists');
                    return resolve();
                }

                connection.query(
                    `CREATE TABLE ${tableName} (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        phoneNumber VARCHAR(15),
                        email VARCHAR(255),
                        linkedId INT,
                        linkPrecedence ENUM("primary", "secondary") NOT NULL,
                        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                        deletedAt TIMESTAMP NULL
                    )`,
                    (error, _) => {
                        if (error) return reject(error);
                        console.log(`Table "${tableName}" created`);
                        return resolve();
                    }
                );
        });
    });
}


// get all records from the table
export const getAllOrders = async (): Promise<any> => {

    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT * FROM ${tableName}`,
            (error, results: any[]) => {
                if (error) return reject(error);
                return resolve(results);
            }
        );
    })
}


// insert the incoming values in the table
export const addNewOrder = async (email: string, phoneNumber: string): Promise<any> => {

    const matchingIds = await new Promise<any>((resolve, reject) => {
        connection.query(
            `SELECT * FROM ${tableName}`,
            (error, results: any[]) => {
                if (error) return reject(error);
                var recordIds = [];
                for (const item of results) {
                    if (email == item.email || phoneNumber == item.phoneNumber) {
                        recordIds.push({
                            id: item.id,
                            linkedId: item.linkedId,
                            precedence: item.linkPrecedence,
                            timeStamp: item.createdAt
                        })
                    }
                }
                if (recordIds.length >= 1) {
                    return resolve(recordIds);
                } else {
                    return resolve(null);                    
                }                
            }
        );            
    });
    
    if (!matchingIds) {
        return new Promise((resolve, reject) => { 
            connection.query(
                `INSERT INTO ${tableName} (phoneNumber, email) VALUES (?, ?)`,
                [phoneNumber, email],
                (error, results) => {
                    if (error) return reject(error);
                    console.log('Record inserted');
                    return resolve(results);
                }
            )
        });
    } else {
        if (matchingIds.length > 1) {
            const getPrimaryRecord = (records: any[]) => {
                return records.filter(record => record.precedence === 'primary');
            };
            const primaryRecords = getPrimaryRecord(matchingIds);
            
            if (primaryRecords.length == 1) {

                return new Promise((resolve, reject) => { 
                    connection.query(
                        `INSERT INTO ${tableName} (
                            phoneNumber, email, linkedId, linkPrecedence
                        ) VALUES (?, ?, ?, ?)`,
                        [phoneNumber, email, primaryRecords[0].id, "secondary"],
                        (error, results) => {
                            if (error) return reject(error);
                            console.log('Record inserted');
                            return resolve(results);
                        }
                    )
                });
            } else {
                const records = primaryRecords.length > 0 ? primaryRecords : matchingIds;                
                
                const maxObj = records.reduce((max: any, current: any) => {
                    return current.timeStamp > max.timeStamp ? current : max;
                });
                const minObj = records.reduce((min: any, current: any) => {
                    return current.timeStamp < min.timeStamp ? current : min;
                });

                const newRecordId = maxObj.id;
                const firstrecordId = primaryRecords.length > 0 ? minObj.id : minObj.linkedId;
                
                return new Promise((resolve, reject) => { 
                    connection.query(
                        `UPDATE ${tableName} SET 
                            linkedId = ?, linkPrecedence = ?,
                            updatedAt = NOW() WHERE id = ?`,
                        [firstrecordId, "secondary", newRecordId],
                        (error, results) => {
                            if (error) return reject(error);
                            connection.query(
                                `UPDATE ${tableName} SET 
                                    linkedId = ?, linkPrecedence = ?,
                                    updatedAt = NOW() WHERE linkedId = ?`,
                                [firstrecordId, "secondary", newRecordId],
                                (error, results) => {
                                    if (error) return reject(error);
                                    return resolve(results);
                                }
                            );
                            console.log('Record updated');
                            return resolve(results);
                        }
                    );
                });
            }        
        } else if (matchingIds.length == 1) {

            const linkedId = matchingIds[0].precedence === "primary" 
                ? matchingIds[0].id
                : matchingIds[0].linkedId;

            return new Promise((resolve, reject) => { 
                connection.query(
                    `INSERT INTO ${tableName} (
                        phoneNumber, email, linkedId, linkPrecedence
                    ) VALUES (?, ?, ?, ?)`,
                    [phoneNumber, email, linkedId, "secondary"],
                    (error, results) => {
                        if (error) {                            
                            return reject(error)};
                        console.log('Record inserted');
                        return resolve(results);
                    }
                )
            });
        } 
    }
}

export default { checkForTable, addNewOrder, getAllOrders };
