require('module-alias/register');

const express = require('express');
const logger = require('@utils/logger');
const cors = require('cors')
const cookieParser = require('cookie-parser');

const authRoutes = require('@routes/auth.routes');
const userRoutes = require('@routes/user.routes');

const app = express();
const PORT = process.env.PORT || 3000;

const API_PREFIX = process.env.API_PREFIX || '/api/v1';

const corsOptions = {
  origin: ['http://localhost:3002', "https://chat.pavel-vacha.cz"],
  credentials: true
}

app.use(cookieParser());
app.use(cors(corsOptions));
app.use(express.json());

// app.use(`${API_PREFIX}/auth`, authRoutes);
// app.use(`${API_PREFIX}/users`, userRoutes);


app.use((req, res, next) => {
  logger.debug({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

app.get('/', (req, res) => {
  logger.info({ message: 'Handling root request' });
  res.send('Hello, world!');
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server running');
});
