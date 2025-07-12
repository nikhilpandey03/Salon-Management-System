const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const cors = require('cors');
const Appointment = require('../models/appointment');
const Barber = require('../models/barber');

// Mock Socket.IO
const mockEmit = jest.fn();
const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
const io = { to: mockTo };

// Create a simplified version of the app for testing
const app = express();
app.use(cors());
app.use(express.json());

// Import routes directly from server.js or recreate them here
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

    // Emit event to barber's room to notify of new appointment
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

    // Emit event to user's room to notify of appointment approval
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

    // Emit event to user's room to notify of appointment rejection
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
  await Appointment.deleteMany({});
  await Barber.deleteMany({});
  mockEmit.mockClear();
  mockTo.mockClear();
});

describe('Appointment API', () => {
  // Test appointment creation
  test('should create a new appointment', async () => {
    const appointmentData = {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '9876543210',
      service: 'Classic Haircut',
      barber: 'John Doe',
      date: '2023-06-15',
      time: '14:00',
      notes: 'First time customer'
    };

    const response = await request(app)
      .post('/appointments')
      .send(appointmentData)
      .expect(201);

    expect(response.body.customerName).toBe(appointmentData.name);
    expect(response.body.email).toBe(appointmentData.email);
    expect(response.body.approved).toBe(false);
    
    // Verify appointment was saved to database
    const savedAppointment = await Appointment.findOne({ email: appointmentData.email });
    expect(savedAppointment).not.toBeNull();
    expect(savedAppointment.customerName).toBe(appointmentData.name);
    
    // Verify socket.io notification was sent
    expect(mockTo).toHaveBeenCalledWith(`barber:${appointmentData.barber}`);
    expect(mockEmit).toHaveBeenCalledWith('new_appointment', expect.objectContaining({
      customerName: appointmentData.name
    }));
  });

  // Test fetching barber appointments
  test('should fetch appointments for a specific barber', async () => {
    // Create test appointments
    const barberName = 'John Doe';
    
    await Appointment.create([
      {
        customerName: 'Customer 1',
        email: 'customer1@example.com',
        phone: '1111111111',
        service: 'Haircut',
        barber: barberName,
        date: '2023-06-15',
        time: '10:00',
        approved: false
      },
      {
        customerName: 'Customer 2',
        email: 'customer2@example.com',
        phone: '2222222222',
        service: 'Beard Trim',
        barber: barberName,
        date: '2023-06-15',
        time: '11:00',
        approved: true
      },
      {
        customerName: 'Customer 3',
        email: 'customer3@example.com',
        phone: '3333333333',
        service: 'Haircut',
        barber: 'Another Barber',
        date: '2023-06-15',
        time: '12:00',
        approved: false
      }
    ]);

    const response = await request(app)
      .get(`/barber-appointments/${barberName}`)
      .expect(200);

    expect(response.body.pendingAppointments.length).toBe(1);
    expect(response.body.confirmedAppointments.length).toBe(1);
    expect(response.body.pendingAppointments[0].customerName).toBe('Customer 1');
    expect(response.body.confirmedAppointments[0].customerName).toBe('Customer 2');
  });

  // Test fetching user appointments
  test('should fetch appointments for a specific user', async () => {
    const userEmail = 'user@example.com';
    
    await Appointment.create([
      {
        customerName: 'Test User',
        email: userEmail,
        phone: '1111111111',
        service: 'Haircut',
        barber: 'Barber 1',
        date: '2023-06-15',
        time: '10:00',
        approved: false
      },
      {
        customerName: 'Test User',
        email: userEmail,
        phone: '1111111111',
        service: 'Beard Trim',
        barber: 'Barber 2',
        date: '2023-06-16',
        time: '11:00',
        approved: true
      },
      {
        customerName: 'Another User',
        email: 'another@example.com',
        phone: '2222222222',
        service: 'Haircut',
        barber: 'Barber 1',
        date: '2023-06-15',
        time: '12:00',
        approved: false
      }
    ]);

    const response = await request(app)
      .get(`/user-appointments/${userEmail}`)
      .expect(200);

    expect(response.body.length).toBe(2);
    expect(response.body[0].email).toBe(userEmail);
    expect(response.body[1].email).toBe(userEmail);
  });

  // Test approving an appointment
  test('should approve an appointment', async () => {
    // Create a test appointment
    const appointment = await Appointment.create({
      customerName: 'Test User',
      email: 'user@example.com',
      phone: '1111111111',
      service: 'Haircut',
      barber: 'John Doe',
      date: '2023-06-15',
      time: '10:00',
      approved: false
    });

    const response = await request(app)
      .put(`/appointments/${appointment._id}/approve`)
      .expect(200);

    expect(response.body.approved).toBe(true);
    
    // Verify appointment was updated in database
    const updatedAppointment = await Appointment.findById(appointment._id);
    expect(updatedAppointment.approved).toBe(true);
    
    // Verify socket.io notification was sent
    expect(mockTo).toHaveBeenCalledWith(`user:${appointment.email}`);
    expect(mockEmit).toHaveBeenCalledWith('appointment_status_changed', expect.objectContaining({
      status: 'approved'
    }));
  });

  // Test rejecting/deleting an appointment
  test('should reject/delete an appointment', async () => {
    // Create a test appointment
    const appointment = await Appointment.create({
      customerName: 'Test User',
      email: 'user@example.com',
      phone: '1111111111',
      service: 'Haircut',
      barber: 'John Doe',
      date: '2023-06-15',
      time: '10:00',
      approved: false
    });

    const response = await request(app)
      .delete(`/appointments/${appointment._id}`)
      .expect(200);

    expect(response.body.message).toBe('Appointment deleted successfully');
    
    // Verify appointment was deleted from database
    const deletedAppointment = await Appointment.findById(appointment._id);
    expect(deletedAppointment).toBeNull();
    
    // Verify socket.io notification was sent
    expect(mockTo).toHaveBeenCalledWith(`user:${appointment.email}`);
    expect(mockEmit).toHaveBeenCalledWith('appointment_status_changed', expect.objectContaining({
      status: 'rejected'
    }));
  });
});