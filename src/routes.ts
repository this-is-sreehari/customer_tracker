import { Request, Response, Router } from 'express';

import { checkForTable, addNewOrder, getAllOrders, deleteOrder } from './orders';


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
