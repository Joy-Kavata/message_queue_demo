const express = require('express');
const { Queue } = require('bullmq');
const Redis = require('ioredis');

const app = express();
app.use(express.json());

// 1. Connect to Redis
const connection = new Redis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null
});

// 2. Instantiate the Print Job Queue
const printQueue = new Queue('badge-print-queue', { connection });

// Mock DB for demonstration
const attendeesDB = {
  'ATT-001': { name: 'Alice Johnson', status: 'NOT_CHECKED_IN' },
  'ATT-002': { name: 'Bob Smith', status: 'NOT_CHECKED_IN' },
  'ATT-003': { name: 'Charlie Davis', status: 'NOT_CHECKED_IN' }
};

// 3. Step 2 Refactored Producer Endpoint
app.post('/api/v1/checkin', async (req, res) => {
  const { attendeeId } = req.body;

  const attendee = attendeesDB[attendeeId];

  if (!attendee) {
    return res.status(404).json({ error: 'Attendee not found' });
  }

  // Duplicate Check: Prevent duplicate queuing
  if (attendee.status === 'PENDING' || attendee.status === 'CHECKED_IN') {
    return res.status(409).json({ 
      error: 'Duplicate scan ignored. Already processing or checked in.' 
    });
  }

  // Requirement 1: Database/State Update -> Set attendee state to PENDING
  attendee.status = 'PENDING';

  // Requirement 2: Publish Message -> Push job onto message queue
  await printQueue.add('print-badge-job', {
    attendeeId: attendee.attendeeId || attendeeId,
    badgeDetails: { name: attendee.name, accessLevel: 'VIP' },
    timestamp: new Date().toISOString()
  });

  // Requirement 3: Response -> Return immediate 202 Accepted status
  return res.status(202).json({
    status: 'PENDING',
    message: 'Print job queued'
  });
});

app.listen(3000, () => console.log('Producer server running on port 3000'));