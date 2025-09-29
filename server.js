import express from 'express';

import allRoutes from './routes/index';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(allRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('...');
});

export default app;
