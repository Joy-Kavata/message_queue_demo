import { Worker } from 'bullmq';

console.log('[Consumer] Worker starting and listening for inventory jobs...');

const worker = new Worker(
  'inventorySync',
  async (job) => {
    console.log(`[Consumer] Processing job ID: ${job.id}`);
    console.log(`[Consumer] Syncing SKU: ${job.data.sku} \vert{} Stock:${job.data.stockCount}`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return { status: 'synced', sku: job.data.sku };
  },
  { connection: { host: '127.0.0.1', port: 6379 } }
);

worker.on('completed', (job) => {
  console.log(`[Consumer] Job ID ${job.id} successfully completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`[Consumer] Job ID ${job?.id} failed:${err.message}`);
});