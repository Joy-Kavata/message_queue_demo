import express from 'express';
import Redis from 'ioredis';
import { Queue } from 'bullmq';

const app = express();
const PORT = 3000;
app.use(express.json());

// 1. Redis Connection & Message Queue Setup
const connection = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null
});

const printQueue = new Queue('badge-print-queue', { connection });

// 2. In-Memory Attendee Database (Handles status & duplicate scan protection)
const attendeesDB = {
  'ATT-001': { attendeeId: 'ATT-001', name: 'Alice Johnson', status: 'NOT_CHECKED_IN' },
  'ATT-002': { attendeeId: 'ATT-002', name: 'Bob Smith', status: 'NOT_CHECKED_IN' },
  'ATT-003': { attendeeId: 'ATT-003', name: 'Charlie Davis', status: 'NOT_CHECKED_IN' }
};

// 3. Check-In Producer Endpoint (Asynchronous Model)
app.post('/api/v1/checkin', async (req, res) => {
  const { attendeeId } = req.body;
  const attendee = attendeesDB[attendeeId];

  if (!attendee) {
    return res.status(404).json({ error: 'Attendee not found' });
  }

  // Duplicate Scan Protection: Ignore if pending or already checked in
  if (attendee.status === 'PENDING' || attendee.status === 'CHECKED_IN') {
    return res.status(409).json({
      error: 'Duplicate scan ignored. Print job in progress or attendee already checked in.'
    });
  }

  // Update status to PENDING
  attendee.status = 'PENDING';

  // Publish print request to Message Queue
  await printQueue.add('print-badge-job', {
    attendeeId: attendee.attendeeId,
    badgeDetails: { name: attendee.name, role: 'Attendee' },
    timestamp: new Date().toISOString()
  });

  // Return immediate 202 Accepted response without waiting for print job completion
  return res.status(202).json({
    status: 'PENDING',
    message: 'Print job queued',
    attendeeId: attendee.attendeeId
  });
});

// 4. Webhook Receiver Endpoint (Callback for completed print jobs)
app.post('/api/v1/webhooks/print-status', (req, res) => {
  const { attendeeId, printStatus } = req.body;
  const attendee = attendeesDB[attendeeId];

  if (attendee && printStatus === 'SUCCESS') {
    attendee.status = 'CHECKED_IN';
    console.log(`[Webhook] Status updated to CHECKED_IN for attendee: ${attendeeId}`);
  }

  return res.status(200).json({ received: true });
});

// 5. Query Endpoint to check current attendee status
app.get('/api/v1/attendees/:attendeeId', (req, res) => {
  const { attendeeId } = req.params;
  const attendee = attendeesDB[attendeeId];

  if (!attendee) {
    return res.status(404).json({ error: 'Attendee not found' });
  }

  res.json(attendee);
});

app.listen(PORT, () => {
  console.log(`[Server] Async Kiosk Service running on http://localhost:${PORT}`);
});