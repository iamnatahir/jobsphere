const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// Get chat history
router.get('/history/:senderId/:receiverId', async (req, res) => {
    try {
        const { senderId, receiverId } = req.params;
        const messages = await Message.find({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ]
        }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Save a new message
router.post('/message', async (req, res) => {
    const message = new Message({
        sender: req.body.sender,
        receiver: req.body.receiver,
        content: req.body.message
    });

    try {
        const newMessage = await message.save();
        res.status(201).json(newMessage);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;

