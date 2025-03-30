require('dotenv').config();
const express = require('express');
const app = express();
const ejs = require('ejs');
const path = require('path');
const expressLayout = require('express-ejs-layouts');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');
const Emitter = require('events');
const MongoDbStore = require('connect-mongo');

// 🌟 Set port
const PORT = process.env.PORT || 3300;

// 🌟 Database connection (Removed deprecated options)
mongoose.connect(process.env.CONNECTION_URL)
    .then(() => console.log('✅ Database connected...'))
    .catch(err => console.log('❌ Connection failed...', err));

// 🌟 Session store
const mongoStore = MongoDbStore.create({
    mongoUrl: process.env.CONNECTION_URL,
    collectionName: 'sessions'
});

// 🌟 Event emitter
const eventEmitter = new Emitter();
app.set('eventEmitter', eventEmitter);

// 🌟 Session config
app.use(session({
    secret: process.env.COOKIE_SECRET || 'default_secret',
    resave: false, 
    store: mongoStore,
    saveUninitialized: false, 
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// 🌟 Passport config
const passportInit = require('./app/config/passport');
passportInit(passport);
app.use(passport.initialize());
app.use(passport.session());

// 🌟 Flash messages
app.use(flash());

// 🌟 Serve static files
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 🌟 Global middleware 
app.use((req, res, next) => {
    res.locals.session = req.session;
    res.locals.user = req.user;
    next();
});

// 🌟 Set Template engine
app.use(expressLayout);
app.set('views', path.join(__dirname, '/resources/views'));
app.set('view engine', 'ejs');

// 🌟 Routes
require('./routes/web')(app);

// 🌟 Start server
const server = app.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
});

// 🌟 Socket.io setup
const io = require('socket.io')(server);
io.on('connection', (socket) => {
    socket.on('join', (orderId) => {
        socket.join(orderId);
    });
});

// 🌟 Event listeners
eventEmitter.on('orderUpdated', (data) => {
    io.to(`order_${data.id}`).emit('orderUpdated', data);
});

eventEmitter.on('orderPlaced', (data) => {
    io.to('adminRoom').emit('orderPlaced', data);
});
