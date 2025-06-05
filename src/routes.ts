import { Request, Response, Router } from 'express';

import { checkForTable, addNewOrder, getAllOrders } from './db';


const router = Router();


router.get('/', async (req: Request, res: Response): Promise<any> => {
    try {
        await checkForTable();
        const result = await getAllOrders();
        return res.status(200).json({
            status: result
        });        
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Error fetching records',
            error: error
        });
    }
});


router.post('/', async (req: Request, res: Response): Promise<any> => {
    try {
        const { phoneNumber, email } = req.body;
        await checkForTable();
        const result = await addNewOrder(email, phoneNumber);
        return res.status(200).json({
            contact: result
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error inserting record',
            error: error
        })
    }
});

export default router;
