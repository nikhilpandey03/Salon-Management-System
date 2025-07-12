const mongoose = require('mongoose');
const {Schema, model} = mongoose;

const BarberSchema = new Schema({
  firstName: {type: String, required: true, unique: true},
  lastName: {type: String, required: true},
  email: {type: String, required: true, unique: true},
  phone: {type: String, required: true},
  shopName: {type: String, required: true},
  address: {type: String, required: true},
  experience: {type: String, required: true},
  specialties: {type: Array},
  password: {type: String, required: true, unique: true}
});

const BarberModel = model('Barber', BarberSchema);

module.exports = BarberModel;