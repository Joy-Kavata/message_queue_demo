import { Queue } from 'bullmq';

const inventoryQueue = new Queue('inventorySync', {
  connection: { host: '127.0.0.1', port: 6379 }
});

async function addSyncJob(sku, stockCount) {
  const job = await inventoryQueue.add(
    'sync-stock', 
    { sku, stockCount, timestamp: new Date().toISOString() },
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
  );
  console.log(`[Producer] Queued sync job ID: ${job.id} for SKU:${sku}`);
}

async function run() {
  await addSyncJob('ITEM-001', 150);
  await addSyncJob('ITEM-002', 42);
  await addSyncJob('ITEM-003', 0);
  process.exit(0);
}

run();