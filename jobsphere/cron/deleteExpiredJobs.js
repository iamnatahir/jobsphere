const cron = require('node-cron');
const Job = require('../models/job'); // Adjust the path as per your project structure

// Schedule task to run daily at midnight
cron.schedule('0 0 * * *', async () => {
    try {
        const currentDate = new Date();

        // Find and delete expired jobs
        const result = await Job.deleteMany({ expiryDate: { $lt: currentDate } });

        console.log(`Deleted ${result.deletedCount} expired jobs.`);
    } catch (error) {
        console.error('Error deleting expired jobs:', error);
    }
});
