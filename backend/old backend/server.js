// index.js
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

dotenv.config();

// Prisma 7+ needs explicit datasource URL for Neon
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
});

const app = express();
app.use(express.json());

// ---------------------- Routes ---------------------- //

// Health check
app.get('/', (req, res) => {
  res.send('Shine Backend is Running!');
});

// Get all users
app.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error(error); // Log full error for debugging
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new user
app.post('/users', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const newUser = await prisma.user.create({
      data: { username, email, password } // In production, hash password!
    });
    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ---------------------- Server ---------------------- //

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server is sprinting on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down server...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
