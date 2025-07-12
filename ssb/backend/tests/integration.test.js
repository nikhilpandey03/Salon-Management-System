const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const cors = require('cors');
const Barber = require('../models/barber');
const Appointment = require('../models/appointment');

// Mock Socket.IO
const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
const io = { to: mockTo };

// Create a simplified version of the app for testing
const app = express();
app.use(cors());
app.use(express.json());

// Import routes directly from server.js or recreate them here
// Barber routes
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

app.get('/barbers', async (req, res) => {
  try {
    const barbers = await Barber.find({}, { password: 0 });

    const formattedBarbers = barbers.map((barber) => ({
      id: barber._id,
      name: `${barber.firstName} ${barber.lastName}`,
      role: barber.experience.includes("yrs") ? barber.experience : `${barber.experience} Experience`,
      experience: `${barber.experience} of experience`,
      shopName: barber.shopName,
      email: barber.email,
      phone: barber.phone,
      specialties: barber.specialties || [],
      image: "https://placehold.co/300x300/e2e8f0/475569?text=" + barber.firstName,
    }));

    res.json(formattedBarbers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch barbers" });
  }
});

// Appointment routes
app.post('/appointments', async (req, res) => {
  try {
    const { name, email, phone, service, barber, date, time, notes } = req.body;

    const appointment = await Appointment.create({
      customerName: name,
      email,
      phone,
      service,
      barber,
      date,
      time,
      notes,
      approved: false,
    });

    io.to(`barber:${barber}`).emit("new_appointment", appointment);

    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/barber-appointments/:barberName', async (req, res) => {
  try {
    const { barberName } = req.params;

    const appointments = await Appointment.find({ barber: barberName });

    const pendingAppointments = appointments.filter(app => !app.approved);
    const confirmedAppointments = appointments.filter(app => app.approved);

    res.json({ pendingAppointments, confirmedAppointments });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

app.get('/user-appointments/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const appointments = await Appointment.find({ email });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

app.put('/appointments/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByIdAndUpdate(id, { approved: true }, { new: true });

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    io.to(`user:${appointment.email}`).emit("appointment_status_changed", {
      id: appointment._id,
      status: "approved",
      appointment,
    });

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: "Failed to approve appointment" });
  }
});

app.delete('/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const userEmail = appointment.email;

    await Appointment.findByIdAndDelete(id);

    io.to(`user:${userEmail}`).emit("appointment_status_changed", {
      id: appointment._id,
      status: "rejected",
      appointment,
    });

    res.json({ message: "Appointment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete appointment" });
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
  await Appointment.deleteMany({});
  mockEmit.mockClear();
  mockTo.mockClear();
});

describe('Integration Tests', () => {
  test('Full flow: barber registration, appointment booking, and management', async () => {
    // Step 1: Register a new barber
    const barberData = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      phone: '1234567890',
      shopName: 'John\'s Barbershop',
      address: '123 Main St',
      experience: '3-5 yrs',
      specialties: ['Classic Cuts', 'Beard Trimming'],
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/create-account')
      .send(barberData)
      .expect(200);

    const barberId = registerResponse.body._id;
    expect(registerResponse.body.firstName).toBe(barberData.firstName);

    // Step 2: Barber login
    const loginResponse = await request(app)
      .post('/barber-login')
      .send({
        barbername: barberData.email,
        password: barberData.password
      })
      .expect(200);

    expect(loginResponse.body.firstName).toBe(barberData.firstName);

    // Step 3: Get all barbers (for customer to choose from)
    const barbersResponse = await request(app)
      .get('/barbers')
      .expect(200);

    expect(barbersResponse.body.length).toBe(1);
    expect(barbersResponse.body[0].name).toBe(`${barberData.firstName} ${barberData.lastName}`);

    // Step 4: Customer books an appointment
    const appointmentData = {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      phone: '9876543210',
      service: 'Classic Haircut',
      barber: `${barberData.firstName} ${barberData.lastName}`,
      date: '2023-06-15',
      time: '14:00',
      notes: 'First time customer'
    };

    const bookingResponse = await request(app)
      .post('/appointments')
      .send(appointmentData)
      .expect(201);

    const appointmentId = bookingResponse.body._id;
    expect(bookingResponse.body.customerName).toBe(appointmentData.name);
    expect(bookingResponse.body.approved).toBe(false);

    // Verify socket notification was sent to barber
    expect(mockTo).toHaveBeenCalledWith(`barber:${appointmentData.barber}`);
    expect(mockEmit).toHaveBeenCalledWith('new_appointment', expect.objectContaining({
      customerName: appointmentData.name
    }));

    // Step 5: Barber views pending appointments
    const barberAppointmentsResponse = await request(app)
      .get(`/barber-appointments/${appointmentData.barber}`)
      .expect(200);

    expect(barberAppointmentsResponse.body.pendingAppointments.length).toBe(1);
    expect(barberAppointmentsResponse.body.confirmedAppointments.length).toBe(0);
    expect(barberAppointmentsResponse.body.pendingAppointments[0].customerName).toBe(appointmentData.name);

    // Step 6: Barber approves the appointment
    const approveResponse = await request(app)
      .put(`/appointments/${appointmentId}/approve`)
      .expect(200);

    expect(approveResponse.body.approved).toBe(true);

    // Verify socket notification was sent to customer
    expect(mockTo).toHaveBeenCalledWith(`user:${appointmentData.email}`);
    expect(mockEmit).toHaveBeenCalledWith('appointment_status_changed', expect.objectContaining({
      status: 'approved'
    }));

    // Step 7: Barber views updated appointments
    const updatedBarberAppointmentsResponse = await request(app)
      .get(`/barber-appointments/${appointmentData.barber}`)
      .expect(200);

    expect(updatedBarberAppointmentsResponse.body.pendingAppointments.length).toBe(0);
    expect(updatedBarberAppointmentsResponse.body.confirmedAppointments.length).toBe(1);
    expect(updatedBarberAppointmentsResponse.body.confirmedAppointments[0].customerName).toBe(appointmentData.name);

    // Step 8: Customer views their appointments
    const customerAppointmentsResponse = await request(app)
      .get(`/user-appointments/${appointmentData.email}`)
      .expect(200);

    expect(customerAppointmentsResponse.body.length).toBe(1);
    expect(customerAppointmentsResponse.body[0].customerName).toBe(appointmentData.name);
    expect(customerAppointmentsResponse.body[0].approved).toBe(true);

    // Step 9: Book another appointment for the same customer
    const secondAppointmentData = {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      phone: '9876543210',
      service: 'Beard Trim',
      barber: `${barberData.firstName} ${barberData.lastName}`,
      date: '2023-06-20',
      time: '15:00',
      notes: 'Follow-up appointment'
    };

    const secondBookingResponse = await request(app)
      .post('/appointments')
      .send(secondAppointmentData)
      .expect(201);

    const secondAppointmentId = secondBookingResponse.body._id;

    // Step 10: Barber rejects the second appointment
    const rejectResponse = await request(app)
      .delete(`/appointments/${secondAppointmentId}`)
      .expect(200);

    expect(rejectResponse.body.message).toBe('Appointment deleted successfully');

    // Verify socket notification was sent to customer
    expect(mockTo).toHaveBeenCalledWith(`user:${secondAppointmentData.email}`);
    expect(mockEmit).toHaveBeenCalledWith('appointment_status_changed', expect.objectContaining({
      status: 'rejected'
    }));

    // Step 11: Verify the appointment was deleted
    const finalBarberAppointmentsResponse = await request(app)
      .get(`/barber-appointments/${appointmentData.barber}`)
      .expect(200);

    expect(finalBarberAppointmentsResponse.body.pendingAppointments.length).toBe(0);
    expect(finalBarberAppointmentsResponse.body.confirmedAppointments.length).toBe(1);

    // Step 12: Customer views their final appointments
    const finalCustomerAppointmentsResponse = await request(app)
      .get(`/user-appointments/${appointmentData.email}`)
      .expect(200);

    expect(finalCustomerAppointmentsResponse.body.length).toBe(1);
    expect(finalCustomerAppointmentsResponse.body[0]._id).toBe(appointmentId);
  });
});