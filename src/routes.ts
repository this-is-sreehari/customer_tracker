import { Request, Response, Router } from 'express';

import { checkForTable, insertIntoTable } from './db';


const router = Router();


router.get('/', async (req: Request, res: Response): Promise<any> => {
    try {
        await checkForTable();
        return res.status(200).json({
            status: `working properly.`
        });        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            error: 'Internal Server Error',
        });
    }
});


router.post('/', async (req, res): Promise<any> => {
    const { phoneNumber, email } = req.body;
    try {
        const result = await insertIntoTable(email, phoneNumber);
        return res.status(201).json({
            data: result
        });
    } catch (error) {
        return res.status(500).json({
            message: 'error inserting'
        })
    }
});

export default router;
