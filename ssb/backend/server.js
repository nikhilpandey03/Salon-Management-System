const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const http = require("http")
const { Server } = require("socket.io")
const Barber = require("./models/barber")
const Appointment = require("./models/appointment")

const app = express()
const server = http.createServer(app)

// Set up Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your frontend domain
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
})

// Middleware
app.use(cors())
app.use(express.json())

// Connect to MongoDB with proper error handling
mongoose
  .connect("mongodb+srv://hvrSSB04:qwertySSB1234@clusterssb.6zmqk.mongodb.net/")
  .then(() => {
    console.log("Connected to MongoDB Atlas")
    // Only start the server after successful database connection
    server.listen(4000, () => console.log("Server running on port 4000"))
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err)
    process.exit(1) // Exit with error
  })

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id)

  // Join a room specific to the user or barber
  socket.on("join", (data) => {
    if (data.type === "user" && data.email) {
      socket.join(`user:${data.email}`)
      console.log(`User ${data.email} joined their room`)
    } else if (data.type === "barber" && data.name) {
      socket.join(`barber:${data.name}`)
      console.log(`Barber ${data.name} joined their room`)
    }
  })

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
  })
})

// API endpoint for creating a barber account
app.post("/create-account", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, shopName, address, experience, specialties, password } = req.body

    console.log("Received data:", req.body) // Log the received data

    // Check if a barber with the same email already exists
    const existingBarber = await Barber.findOne({ email })
    if (existingBarber) {
      return res.status(400).json({ error: "A barber with this email already exists" })
    }

    const barberDoc = await Barber.create({
      firstName,
      lastName,
      email,
      phone,
      shopName,
      address,
      experience,
      specialties,
      password,
    })

    console.log("Barber created:", barberDoc)
    res.json(barberDoc)
  } catch (error) {
    console.error("Error creating barber:", error)
    res.status(500).json({ error: error.message })
  }
})

// API endpoint for barber login
app.post("/barber-login", async (req, res) => {
  try {
    const { barbername, password } = req.body

    console.log("Login attempt for:", barbername)

    // Find barber by first name, last name, or email
    const barber = await Barber.findOne({
      $or: [{ firstName: barbername }, { lastName: barbername }, { email: barbername }],
    })

    if (!barber) {
      return res.status(401).json({ error: "Invalid username or password" })
    }

    // Check password
    if (barber.password !== password) {
      return res.status(401).json({ error: "Invalid username or password" })
    }

    // Return barber info (excluding password)
    const barberInfo = {
      id: barber._id,
      firstName: barber.firstName,
      lastName: barber.lastName,
      email: barber.email,
      shopName: barber.shopName,
    }

    res.json(barberInfo)
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Server error. Please try again later." })
  }
})

// API endpoint to get all barbers for the customer page
app.get("/barbers", async (req, res) => {
  try {
    // Find all barbers and exclude password field
    const barbers = await Barber.find({}, { password: 0 })

    // Format the barber data for the frontend
    const formattedBarbers = barbers.map((barber) => ({
      id: barber._id,
      name: `${barber.firstName} ${barber.lastName}`,
      role: barber.experience.includes("yrs") ? barber.experience : `${barber.experience} Experience`,
      experience: `${barber.experience} of experience`,
      shopName: barber.shopName,
      email: barber.email,
      phone: barber.phone,
      specialties: barber.specialties || [],
      // Use a placeholder image if no image is available
      image: "https://placehold.co/300x300/e2e8f0/475569?text=" + barber.firstName,
    }))

    res.json(formattedBarbers)
  } catch (error) {
    console.error("Error fetching barbers:", error)
    res.status(500).json({ error: "Failed to fetch barbers" })
  }
})

// API endpoint to create a new appointment
app.post("/appointments", async (req, res) => {
  try {
    const { name, email, phone, service, barber, date, time, notes } = req.body

    // Create a new appointment
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
    })

    console.log("Appointment created:", appointment)

    // Emit event to barber's room to notify of new appointment
    io.to(`barber:${barber}`).emit("new_appointment", appointment)

    res.status(201).json(appointment)
  } catch (error) {
    console.error("Error creating appointment:", error)
    res.status(500).json({ error: error.message })
  }
})

// API endpoint to get appointments for a specific barber
app.get("/barber-appointments/:barberName", async (req, res) => {
  try {
    const { barberName } = req.params

    // Find all appointments for this barber
    const appointments = await Appointment.find({ barber: barberName })

    // Separate into pending and confirmed
    const pendingAppointments = appointments.filter((app) => !app.approved)
    const confirmedAppointments = appointments.filter((app) => app.approved)

    res.json({ pendingAppointments, confirmedAppointments })
  } catch (error) {
    console.error("Error fetching appointments:", error)
    res.status(500).json({ error: "Failed to fetch appointments" })
  }
})

// API endpoint to get appointments for a specific user by email
app.get("/user-appointments/:email", async (req, res) => {
  try {
    const { email } = req.params

    // Find all appointments for this user
    const appointments = await Appointment.find({ email })

    res.json(appointments)
  } catch (error) {
    console.error("Error fetching user appointments:", error)
    res.status(500).json({ error: "Failed to fetch appointments" })
  }
})

// API endpoint to approve an appointment
app.put("/appointments/:id/approve", async (req, res) => {
  try {
    const { id } = req.params

    const appointment = await Appointment.findByIdAndUpdate(id, { approved: true }, { new: true })

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" })
    }

    // Emit event to user's room to notify of appointment approval
    io.to(`user:${appointment.email}`).emit("appointment_status_changed", {
      id: appointment._id,
      status: "approved",
      appointment,
    })

    res.json(appointment)
  } catch (error) {
    console.error("Error approving appointment:", error)
    res.status(500).json({ error: "Failed to approve appointment" })
  }
})

// API endpoint to reject/delete an appointment
app.delete("/appointments/:id", async (req, res) => {
  try {
    const { id } = req.params

    const appointment = await Appointment.findById(id)

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" })
    }

    // Store the email before deleting
    const userEmail = appointment.email

    // Delete the appointment
    await Appointment.findByIdAndDelete(id)

    // Emit event to user's room to notify of appointment rejection
    io.to(`user:${userEmail}`).emit("appointment_status_changed", {
      id: appointment._id,
      status: "rejected",
      appointment,
    })

    res.json({ message: "Appointment deleted successfully" })
  } catch (error) {
    console.error("Error deleting appointment:", error)
    res.status(500).json({ error: "Failed to delete appointment" })
  }
})

