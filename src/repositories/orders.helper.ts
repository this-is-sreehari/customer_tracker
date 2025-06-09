import { connection, tableName } from '../config/db';


export enum FieldType {
    email,
    phoneNumber
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

export default { 
    FieldType, 
    getFieldData, 
    getAllSecondaryContacts, 
    bothEmailAndNumberExists, 
    checkForTable
}
