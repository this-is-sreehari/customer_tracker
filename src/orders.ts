import { connection, tableName } from './db';


enum FieldType {
    email,
    phoneNumber
}


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
                        linkPrecedence ENUM('primary', 'secondary') NOT NULL,
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
                            getFieldData(primaryContatctId, FieldType.email) .then((emails) => {
                                getFieldData(primaryContatctId, FieldType.phoneNumber) .then((numbers) => {
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

            const status = await bothEmailAndNumberExists(email, phoneNumber);

            // update the record if both the email and phone number is present in db
            if (status) {
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
                                            getFieldData(primaryContatctId, FieldType.email) .then((emails) => {
                                                getFieldData(primaryContatctId, FieldType.phoneNumber) .then((numbers) => {
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

            } else {
                // if only email or only phone number or neither exists, then create new record
                return new Promise((resolve, reject) => {
                    connection.query(
                        `INSERT INTO ${tableName} (
                            phoneNumber, email, linkedId, linkPrecedence
                        ) VALUES (?, ?, ?, ?)`,
                        [phoneNumber, email, firstRecordId, "secondary"],
                        (error, results) => {
                            if (error) return reject(error);
                            connection.query(
                                `SELECT * FROM ${tableName} WHERE id = ? or linkedId = ?`,
                                [firstRecordId, firstRecordId],
                                (error, results: any) => {
                                    if (error) return reject(error);
                                    const primaryContatctId: number = 
                                        results[0].linkPrecedence == "primary" 
                                            ? results[0].id
                                            : results[0].linkedId;
                                    getFieldData(primaryContatctId, FieldType.email) .then((emails) => {
                                        getFieldData(primaryContatctId, FieldType.phoneNumber) .then((numbers) => {
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
                                getFieldData(primaryContatctId, FieldType.email) .then((emails) => {
                                    getFieldData(primaryContatctId, FieldType.phoneNumber) .then((numbers) => {
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


export const deleteOrder = async (id: number): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        connection.query(
            `DELETE FROM ${tableName} WHERE id = ?`,
            [id],
            (error, results: any) => {
                if (error) return reject(error);
                if (results.affectedRows == 1) return resolve(true);
                return resolve(false);
            }
        )
    });
}


export const getFieldData = async (id: number, type: FieldType): Promise<any> => {
    const data: any = [];
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT * FROM ${tableName} WHERE id = ? or linkedId = ?`,
            [id, id],
            (error, results: any[]) => {
                if (error) return reject(error);
                for (const item of results) {
                    if (type == FieldType.email) {
                        if (item.email != null) data.push(item.email);
                    } else {
                        if (item.phoneNumber != null) data.push(item.phoneNumber);
                    }
                }
                const filteredData = [...new Set(data)]
                return resolve(filteredData);
            }
        )
    });
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


export const bothEmailAndNumberExists = async (email: string, phone: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        connection.query(
            `SELECT * FROM ${tableName} WHERE email = ?`,
            [email],
            (error, results: any[]) => {
                if (error) return reject(error);
                if (results.length > 0) {
                    connection.query(
                        `SELECT * FROM ${tableName} WHERE phoneNumber = ?`,
                        [phone],
                        (error, results: any) => {
                            if (error) return reject(error);
                            if (results.length > 0) {
                                return resolve(true);
                            } else {
                                return resolve(false);
                            }
                        }
                    )
                } else {
                    return resolve(false);
                }
            }
        );
    })
} 


export default { checkForTable, addNewOrder, getAllOrders, deleteOrder };
