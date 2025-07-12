const mongoose = require("mongoose")
const { Schema, model } = mongoose

const AppointmentSchema = new Schema({
  customerName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  service: { type: String, required: true },
  barber: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  notes: { type: String },
  approved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

const AppointmentModel = model("Appointment", AppointmentSchema)

module.exports = AppointmentModel

