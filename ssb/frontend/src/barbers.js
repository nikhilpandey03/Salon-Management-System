const barbers = [
  { barbername: "Nikhil", email: "barber1@example.com", password: "Nikabc" },
  { barbername: "Pandey", email: "barber2@example.com", password: "Pandeyabc" }
];

// Function to add a new user (simulating storage)
export function addbarbers(newbarber) {
  barbers.push(newbarber);
}

// Function to check if user exists (for login)
export function validatebarbers(barbername, password) {
  return barbers.find(barbers => barbers.barbername === barbername && barbers.password === password);
}

export default barbers;
