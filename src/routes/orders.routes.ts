import { Request, Response, Router } from 'express';

import { checkForTable } from '../repositories/orders.helper';
import { addNewOrder, getAllOrders, deleteOrder } from '../repositories/orders.repositories';


const router = Router();


router.get('/', async (req: Request, res: Response): Promise<any> => {
    try {
        await checkForTable();
        const result = await getAllOrders();
        return res.status(200).json({
            data: result
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
        let { phoneNumber, email } = req.body;

        const nullStr: string = 'null';
        if (email == nullStr || email == nullStr.toUpperCase()) email = null;
        if (phoneNumber == nullStr || phoneNumber == nullStr.toUpperCase()) phoneNumber = null;
        
        if (!email && !phoneNumber)
            return res.status(400).json({
                error: 'Invalid request body',
                message: 'Both email & phoneNumber fields cannot be null at the same time. Provide at least one of them'
            });
        
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


router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params;
        const result = await deleteOrder(parseInt(id));
        if (result) return res.status(204).json();
        return res.status(404).json({
            message: 'Record does not exist'
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: 'Error deleting record',
            error: error
        });
    }
});


export default router;
