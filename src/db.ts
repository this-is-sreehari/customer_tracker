import { error } from 'console';
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

    // get all records having data similar to data from request
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
    
    // for new records
    if (!matchingIds) {
        return new Promise((resolve, reject) => { 
            connection.query(
                `INSERT INTO ${tableName} (phoneNumber, email) VALUES (?, ?)`,
                [phoneNumber, email],
                (error, results: any) => {
                    if (error) return reject(error);
                    console.log('Record inserted');
                    connection.query(
                        `SELECT * FROM ${tableName} WHERE id = ?`,
                        [results.insertId],
                        (error, results: any) => {
                            if (error) return reject(error);
                            const primaryContatctId: number = 
                                results[0].linkPrecedence == "primary" 
                                    ? results[0].id
                                    : results[0].linkedId;
                            getAllEmailIds(primaryContatctId).then((emails) => {
                                getAllPhoneNumbers(primaryContatctId).then((numbers) => {
                                    getAllSecondaryContacts(primaryContatctId).then((contacts) => {
                                        const data = {
                                            "primaryContatctId": primaryContatctId,
                                            "emails": emails,
                                            "phoneNumbers": numbers,
                                            "secondaryContactIds": contacts
                                        };
                                        return resolve(data);
                                    })
                                });
                            });

                        }
                    )
                }
            )
        });
    } else {

        // handles the case where more than one matching record is present
        if (matchingIds.length > 1) {
 
            const records = matchingIds;                
            
            const minObj = records.reduce((min: any, current: any) => {
                return current.timeStamp < min.timeStamp ? current : min;
            });

            const firstRecordId = minObj.precedence == "primary" ? minObj.id : minObj.linkedId;
            
            type RecordType = {
                id: number;
                linkedId: number | null;
                precedence: 'primary' | 'secondary';
                timeStamp: Date;
            };
                
            const allIds = records.filter(
                (record: RecordType) => record.id !== firstRecordId)  
                .map((record: RecordType) => record.id
            )
            const placeholders = allIds.map(() => '?').join(',');

            return new Promise((resolve, reject) => { 
                connection.query(
                    `UPDATE ${tableName} SET 
                        linkedId = ?, linkPrecedence = ?,
                        updatedAt = NOW() WHERE id IN (${placeholders})`,
                    [firstRecordId, "secondary", ...allIds],
                    (error, results) => {
                        if (error) return reject(error);
                        connection.query(
                            `UPDATE ${tableName} SET 
                                linkedId = ?, linkPrecedence = ?,
                                updatedAt = NOW() WHERE linkedId IN (${placeholders})`,
                            [firstRecordId, "secondary", ...allIds],
                            (error, results) => {
                                if (error) return reject(error);
                                console.log('Record updated');
                                connection.query(
                                    `SELECT * FROM ${tableName} WHERE id = ? or linkedId = ?`,
                                    [firstRecordId, firstRecordId],
                                    (error, results: any) => {
                                        if (error) return reject(error);
                                        const primaryContatctId: number = 
                                            results[0].linkPrecedence == "primary" 
                                                ? results[0].id
                                                : results[0].linkedId;
                                        getAllEmailIds(primaryContatctId).then((emails) => {
                                            getAllPhoneNumbers(primaryContatctId).then((numbers) => {
                                                getAllSecondaryContacts(primaryContatctId).then((contacts) => {
                                                    const data = {
                                                        "primaryContatctId": primaryContatctId,
                                                        "emails": emails,
                                                        "phoneNumbers": numbers,
                                                        "secondaryContactIds": contacts
                                                    };
                                                    return resolve(data);
                                                })
                                            });
                                        });
            
                                    }
                                )
                            }
                        );
                    }
                );
            });
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
                        if (error) return reject(error);
                        console.log('Record inserted');
                        connection.query(
                            `SELECT * FROM ${tableName} WHERE id = ? or linkedId = ?`,
                            [linkedId, linkedId],
                            (error, results: any) => {
                                if (error) return reject(error);
                                const primaryContatctId: number = 
                                    results[0].linkPrecedence == "primary" 
                                        ? results[0].id
                                        : results[0].linkedId;
                                getAllEmailIds(primaryContatctId).then((emails) => {
                                    getAllPhoneNumbers(primaryContatctId).then((numbers) => {
                                        getAllSecondaryContacts(primaryContatctId).then((contacts) => {
                                            const data = {
                                                "primaryContatctId": primaryContatctId,
                                                "emails": emails,
                                                "phoneNumbers": numbers,
                                                "secondaryContactIds": contacts
                                            };
                                            return resolve(data);
                                        })
                                    });
                                });
    
                            }
                        )
                    }
                )
            });
        } 
    }
}


export const getAllEmailIds = async (id: number): Promise<any> => {
    const emailIds: any = [];
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT * FROM ${tableName} WHERE id = ? or linkedId = ?`,
            [id, id],
            (error, results: any[]) => {
                if (error) return reject(error);
                for (const item of results) {
                    emailIds.push(item.email);
                }
                const filteredEmailIds = [...new Set(emailIds)]
                return resolve(filteredEmailIds);
            }
        );
    })
}


export const getAllPhoneNumbers = async (id: number): Promise<any> => {
    const numbers: any = [];
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT * FROM ${tableName} WHERE id = ? or linkedId = ?`,
            [id, id],
            (error, results: any[]) => {
                if (error) return reject(error);
                for (const item of results) {
                    numbers.push(item.phoneNumber);
                }
                const filteredPhoneNumbers = [...new Set(numbers)]
                return resolve(filteredPhoneNumbers);
            }
        );
    })
} 


export const getAllSecondaryContacts = async (id: number): Promise<any> => {
    const contacts: any = [];
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT * FROM ${tableName} WHERE linkedId = ?`,
            [id],
            (error, results: any[]) => {
                if (error) return reject(error);
                for (const item of results) {
                    contacts.push(item.id);
                }
                return resolve(contacts);
            }
        );
    })
} 

export default { checkForTable, addNewOrder, getAllOrders };
