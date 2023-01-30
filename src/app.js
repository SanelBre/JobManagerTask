import express from 'express';
import { sequelize } from './model.js';
import {
	ContractRouter,
	JobsRouter,
	UserRouter,
	AdminRouter,
} from './routes/index.js';

const app = express();

app.use(express.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

app.use([UserRouter, ContractRouter, JobsRouter, AdminRouter]);

export default app;
