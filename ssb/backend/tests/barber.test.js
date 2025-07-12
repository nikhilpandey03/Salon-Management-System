const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const cors = require('cors');
const Barber = require('../models/barber');

// Create a simplified version of the app for testing
const app = express();
app.use(cors());
app.use(express.json());

// Import routes directly from server.js or recreate them here
app.post('/create-account', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, shopName, address, experience, specialties, password } = req.body;
    
    const existingBarber = await Barber.findOne({ email });
    if (existingBarber) {
      return res.status(400).json({ error: "A barber with this email already exists" });
    }

    const barberDoc = await Barber.create({
      firstName, lastName, email, phone, shopName, address, experience, specialties, password
    });

    res.json(barberDoc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/barber-login', async (req, res) => {
  try {
    const { barbername, password } = req.body;

    const barber = await Barber.findOne({
      $or: [{ firstName: barbername }, { lastName: barbername }, { email: barbername }]
    });

    if (!barber) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (barber.password !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const barberInfo = {
      id: barber._id,
      firstName: barber.firstName,
      lastName: barber.lastName,
      email: barber.email,
      shopName: barber.shopName
    };

    res.json(barberInfo);
  } catch (error) {
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongoServer.stop();
});

afterEach(async () => {
  await Barber.deleteMany({});
});

describe('Barber API', () => {
  // Test barber registration
  test('should create a new barber account', async () => {
    const barberData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
      shopName: 'John\'s Barbershop',
      address: '123 Main St',
      experience: '3-5 yrs',
      specialties: ['Classic Cuts', 'Beard Trimming'],
      password: 'password123'
    };

    const response = await request(app)
      .post('/create-account')
      .send(barberData)
      .expect(200);

    expect(response.body.firstName).toBe(barberData.firstName);
    expect(response.body.email).toBe(barberData.email);
    
    // Verify barber was saved to database
    const savedBarber = await Barber.findOne({ email: barberData.email });
    expect(savedBarber).not.toBeNull();
    expect(savedBarber.firstName).toBe(barberData.firstName);
  });

  // Test duplicate email
  test('should not allow duplicate email', async () => {
    const barberData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
      shopName: 'John\'s Barbershop',
      address: '123 Main St',
      experience: '3-5 yrs',
      specialties: ['Classic Cuts', 'Beard Trimming'],
      password: 'password123'
    };

    // Create first barber
    await request(app)
      .post('/create-account')
      .send(barberData);

    // Try to create second barber with same email
    const response = await request(app)
      .post('/create-account')
      .send(barberData)
      .expect(400);

    expect(response.body.error).toBe('A barber with this email already exists');
  });

  // Test barber login
  test('should login a barber with correct credentials', async () => {
    // First create a barber
    const barberData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
      shopName: 'John\'s Barbershop',
      address: '123 Main St',
      experience: '3-5 yrs',
      specialties: ['Classic Cuts', 'Beard Trimming'],
      password: 'password123'
    };

    await request(app)
      .post('/create-account')
      .send(barberData);

    // Now try to login
    const loginResponse = await request(app)
      .post('/barber-login')
      .send({
        barbername: 'john.doe@example.com',
        password: 'password123'
      })
      .expect(200);

    expect(loginResponse.body.firstName).toBe(barberData.firstName);
    expect(loginResponse.body.email).toBe(barberData.email);
  });

  // Test invalid login
  test('should reject login with incorrect credentials', async () => {
    // First create a barber
    const barberData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
      shopName: 'John\'s Barbershop',
      address: '123 Main St',
      experience: '3-5 yrs',
      specialties: ['Classic Cuts', 'Beard Trimming'],
      password: 'password123'
    };

    await request(app)
      .post('/create-account')
      .send(barberData);

    // Try to login with wrong password
    const loginResponse = await request(app)
      .post('/barber-login')
      .send({
        barbername: 'john.doe@example.com',
        password: 'wrongpassword'
      })
      .expect(401);

    expect(loginResponse.body.error).toBe('Invalid username or password');
  });
});