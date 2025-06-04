import express, { Request, Response } from 'express';
import connection from './db';

const app = express();

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    connection.query('SELECT * FROM customer', (error, results) => {
        if (error) {
          return res.status(500).json({ error });
        }
        res.status(200).json(results);
    });
});


export default app;
