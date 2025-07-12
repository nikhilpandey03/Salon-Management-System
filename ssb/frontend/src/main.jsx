import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter as Router, Route, Routes } from "react-router-dom"
import "./index.css"
import Start from "./start.jsx"
import CustomerPage from "./user.jsx"
import BarberPage from "./Barberpage.jsx"
import SignIn from "./signin.jsx"
import CreateAccount from "./createaccount.jsx"
import BarberProfile from "./profile.jsx"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      {" "}
      {/* Wrap everything inside Router */}
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/customer" element={<CustomerPage />} />
        <Route path="/barber" element={<BarberPage />} />
        <Route path="/barberSignIn" element={<SignIn />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/profile" element={<BarberProfile />} />
      </Routes>
    </Router>
  </StrictMode>,
)

