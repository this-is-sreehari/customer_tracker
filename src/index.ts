import express from 'express';

import router from './routes';


const PORT = parseInt(process.env.PORT || '3000');

const app = express();

app.use(express.json());

app.use('/identify', router);

app.listen(PORT, () => console.log(`App started successfully and is listening on port ${PORT}`));
