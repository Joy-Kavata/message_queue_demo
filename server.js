import express from 'express';
import Redis from 'ioredis';
import { fetchWarehouseStock } from './mockWarehouse.js';

const app = express();
const PORT = 3000;
app.use(express.json());

const redis = new Redis({ host: '127.0.0.1', port: 6379 });

async function pollWarehouseData() {
  console.log('[Polling] Fetching stock levels from Warehouse API...');
  try {
    const stockData = await fetchWarehouseStock();
    for (const item of stockData) {
      await redis.set(`item:${item.sku}`, item.stock);
      console.log(`[Cache Updated] ${item.sku} => ${item.stock} units`);
    }
  } catch (error) {
    console.error('[Polling Error]', error);
  }
}

pollWarehouseData();

const POLLING_INTERVAL = 5 * 60 * 1000;
setInterval(pollWarehouseData, POLLING_INTERVAL);

app.get('/api/inventory/:sku', async (req, res) => {
  const { sku } = req.params;
  const stock = await redis.get(`item:${sku}`);

  if (stock === null) {
    return res.status(404).json({ error: `SKU ${sku} not found in cache` });
  }

  res.json({ sku, stock: parseInt(stock, 10), fetchedAt: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[Server] Baseline service running on http://localhost:${PORT}`);
});