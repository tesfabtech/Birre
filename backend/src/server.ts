import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import prisma from './lib/prisma.js';
import usersRouter from './routes/users.js';
import moneySourcesRouter from './routes/money-sources.js';
import bucketsRouter from './routes/buckets.js';
import incomeRouter from './routes/income.js';
import allocationPlansRouter from './routes/allocation-plans.js';
import expensesRouter from './routes/expenses.js';
import categoriesRouter from './routes/categories.js';
import transfersRouter from './routes/transfers.js';
import financialPeriodsRouter from './routes/financial-periods.js';
import { startCategoryCleanupJob } from './jobs/category-cleanup.js';
import goalsRouter from './routes/goals.js';



const app = express();

app.use(cors());
app.use(express.json());

app.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      message: 'Birre API is running',
      database: 'connected',
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Birre API is running',
      database: 'disconnected',
    });
  }
});


//register routers
app.use('/users', usersRouter);
app.use('/money-sources', moneySourcesRouter);
app.use('/buckets', bucketsRouter);
app.use('/income', incomeRouter);
app.use('/allocation-plans', allocationPlansRouter);
app.use('/expenses', expensesRouter);
app.use('/categories', categoriesRouter);
app.use('/transfers', transfersRouter);
app.use('/financial-periods', financialPeriodsRouter);
app.use('/goals', goalsRouter);


// Start the category cleanup job
startCategoryCleanupJob();



const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Birre API running on http://localhost:${PORT}`);
});