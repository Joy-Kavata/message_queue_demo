import { Worker } from 'bullmq';
import Redis from 'ioredis';
import axios from 'axios';

// Connect to Redis
const connection = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null
});

// Create BullMQ Worker Consumer
const worker = new Worker(
  'badge-print-queue',
  async (job) => {
    console.log(`[Consumer] Processing print job for attendee: ${job.data.attendeeId}`);

    // Simulate badge printer delay (3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Send Webhook Callback back to Express Server
    await axios.post('http://localhost:3000/api/v1/webhooks/print-status', {
      attendeeId: job.data.attendeeId,
      printStatus: 'SUCCESS',
      printedAt: new Date().toISOString()
    });

    console.log(`[Consumer] Webhook callback sent for attendee: ${job.data.attendeeId}`);
  },
  { connection }
);

console.log('[Consumer] Worker is running and listening for queue jobs...');