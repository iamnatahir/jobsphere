const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const session = require("express-session");
const flash = require("connect-flash");
const Job = require('./models/job');
const User = require('./models/user');
const { isAuthenticated } = require("./middleware/auth");
const Chat = require('./models/chat');
const Message = require('./models/Message');
const notificationRoutes = require("./routes/notificationRoutes");
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { path: '/socket.io' });

//app.use('/socket.io', express.static('node_modules/socket.io/client-dist'));
app.use('/socket.io', express.static('node_modules/socket.io/client-dist'));

app.use(cors({
  origin: "http://localhost:5000",
  credentials: true,
}));

app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));
app.use(session(
  { secret: "secret", resave: false, saveUninitialized: false }
));
app.use(flash());
app.use((req, res, next) => {
  res.locals.successMessage = req.flash('success');   
  res.locals.errorMessage = req.flash('error');
  res.locals.user = req.session.user || null;
  

  next();
});


const connectDB = require('./db');

dotenv.config();


//new line
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// new line

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: "/tmp"
}))

// Set up EJS
app.use(expressLayouts);
app.set('layout', 'layouts/main'); // Default layout
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const userRoutes = require('./routes/userRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const jobRoutes = require('./routes/jobRoutes');
//const notificationRoutes = require('./routes/notificationRoutes');

// Use routes

app.use("/notifications", notificationRoutes);
app.use('/users', userRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/application', applicationRoutes);
app.use('/job', jobRoutes);
//app.use('/notification', notificationRoutes);


// Frontend Routes
app.get('/', (req, res) => {
  res.render('users/index', { layout: 'layouts/main' });
});

app.get('/login', (req, res) => {
  const message = req.query.message || null;
  res.render('users/login', { layout: 'layouts/main', message });
});

app.get('/register', (req, res) => {
  res.render('users/register', { layout: 'layouts/main' });
});

app.get('/forgotPassword', (req, res) => {
  res.render('users/forgotPassword', { layout: 'layouts/main' });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

app.get('/admin', (req, res) => {
  const { token } = req.query;
  res.render('users/admin', { layout: 'layouts/main' });
});

app.get('/updateProfile', (req, res) => {
  res.render('users/updateProfile', { layout: 'layout/mains' });
})
app.get('/admin_dashboard', (req, res) => {
  const { token } = req.query;
  res.render('users/a_dashboard', { layout: 'layouts/main' });
});

app.get('/employer_dashboard', (req, res) => {
  res.render('users/employer_dashboard', { layout: 'layouts/main' });
});

app.get('/jobSeeker_dashboard', (req, res) => {
  res.render('users/jobSeeker_dashboard', { layout: 'layouts/main' });
});

app.get('/profile', isAuthenticated, (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('users/profile', { layout: 'layouts/main', user: req.session.user });
});


app.get('/resetPassword', (req, res) => {
  const { token } = req.query;
  res.render('users/resetPassword', { layout: "layouts/main", token });
});

app.get('/jobPostForm', (req, res) => {
  const { token } = req.query;
  res.render('job/jobPostForm', { layout: "layouts/main" }, token);
});

app.get('/viewJob', (req, res) => {
  res.render('job/viewJob', { layout: "layouts/main" });
});


app.get('/JobApplicationForm', (req, res) => {
  const { token } = req.query;
  res.render('JobApplication/applicationForm', { layout: "layouts/main", });
});

app.get('/viewAllApplications', (req, res) => {
  const { token } = req.query;
  res.render('JobApplication/viewApplications', { layout: "layouts/main", });
});

app.get('/deleteApplication', (req, res) => {
  const { token } = req.query;
  res.render('JobApplication/deleteApplication', { layout: "layouts/main", });
});

app.get('/GetApplications', (req, res) => {
  const { token } = req.query;
  res.render('JobApplication/employerView', { layout: "layouts/main", });
});

app.use("/", notificationRoutes);
connectDB();
// Socket.IO
// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('employerConnected', ({ employerId }) => {
    console.log('Employer connected:', employerId);
    socket.join(`user_${employerId}`);
  });

  socket.on('joinChat', async ({ chatId, userId, userType }) => {
    try {
      console.log('Joining chat room:', chatId, 'User:', userId, 'Type:', userType);

      const userObjectId = new mongoose.Types.ObjectId(userId);

      socket.join(chatId);

      await Message.updateMany(
        { chatId, receiver: userObjectId, isRead: false },
        { $set: { isRead: true } }
      );

      const messages = await Message.find({ chatId })
        .sort('timestamp')
        .populate('sender', 'name');

      console.log('Sending chat history:', messages);
      socket.emit('chatHistory', messages);

    } catch (error) {
      console.error('Error in joinChat:', error);
      socket.emit('error', { message: 'Failed to join chat: ' + error.message });
    }
  });

  socket.on('chatMessage', async ({ chatId, sender, message }) => {
    try {
      console.log('Received message:', { chatId, sender, message });

      const senderObjectId = new mongoose.Types.ObjectId(sender);
      const [jobId, employerId] = chatId.split('_');

      const job = await Job.findById(jobId).populate('postedBy');
      if (!job) throw new Error('Job not found');

      const receiver = sender === employerId ?
        job.postedBy._id :
        new mongoose.Types.ObjectId(employerId);

      const newMessage = new Message({
        chatId,
        sender: senderObjectId,
        receiver,
        message,
        isRead: false,
        timestamp: new Date()
      });

      await newMessage.save();
      console.log('Message saved:', newMessage);

      const senderUser = await User.findById(senderObjectId);
      const messageToSend = {
        sender: {
          _id: senderObjectId,
          name: senderUser.name
        },
        message,
        timestamp: newMessage.timestamp
      };

      io.to(chatId).emit('receiveMessage', messageToSend);

      const unreadCount = await Message.countDocuments({
        chatId,
        receiver,
        isRead: false
      });

      io.to(`user_${receiver.toString()}`).emit('unreadCount', unreadCount);

    } catch (error) {
      console.error('Error in chatMessage:', error);
      socket.emit('error', { message: 'Failed to send message: ' + error.message });
    }
  });

  socket.on('getEmployerChats', async ({ employerId }) => {
    try {
      console.log('Fetching chats for employer:', employerId);
      const employerObjectId = new mongoose.Types.ObjectId(employerId);
      const chats = await Chat.find({ users: employerObjectId });

      const chatData = await Promise.all(chats.map(async (chat) => {
        const job = await Job.findById(chat.jobId);
        const [lastMessage] = await Message.find({ chatId: chat.chatId })
          .sort({ timestamp: -1 })
          .limit(1);

        const unreadCount = await Message.countDocuments({
          chatId: chat.chatId,
          receiver: employerObjectId,
          isRead: false
        });

        const otherUserId = chat.users.find(uid => !uid.equals(employerObjectId));
        const otherUser = await User.findById(otherUserId);

        return {
          chatId: chat.chatId,
          jobTitle: job ? job.jobTitle : 'Unknown Job',
          jobSeeker: otherUser ? {
            name: otherUser.name,
            id: otherUser._id
          } : null,
          lastMessage: lastMessage ? {
            text: lastMessage.message,
            timestamp: lastMessage.timestamp,
            sender: lastMessage.sender.toString()
          } : null,
          unreadCount
        };
      }));

      console.log('Sending employer chats:', chatData);
      socket.emit('employerChats', chatData);
    } catch (error) {
      console.error('Error fetching employer chats:', error);
      socket.emit('error', { message: 'Failed to fetch chats: ' + error.message });
    }
  });

  socket.on('markMessagesAsRead', async ({ chatId, userId }) => {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      await Message.updateMany(
        { chatId, receiver: userObjectId, isRead: false },
        { $set: { isRead: true } }
      );

      const unreadCount = await Message.countDocuments({
        receiver: userObjectId,
        isRead: false
      });
      socket.emit('unreadCount', unreadCount);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});



// Start the server
const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

