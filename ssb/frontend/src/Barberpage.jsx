"use client"

import { useState, useEffect, useRef } from "react"
import { FaCalendar, FaClock, FaCheck, FaTimes, FaUserCircle } from "react-icons/fa"
import { useLocation, useNavigate } from "react-router-dom"
import { io } from "socket.io-client" // This requires socket.io-client to be installed

function BarberPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryParams = new URLSearchParams(location.search)
  const barbername = queryParams.get("barbername") // Extract "barbername" from URL

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [barberInfo, setBarberInfo] = useState(null)
  const [activeTab, setActiveTab] = useState("pending")
  const [pendingAppointments, setPendingAppointments] = useState([])
  const [confirmedAppointments, setConfirmedAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const socketRef = useRef(null)
  const [newAppointmentAlert, setNewAppointmentAlert] = useState(false)

  // Initialize Socket.IO connection
  useEffect(() => {
    socketRef.current = io("http://localhost:4000")

    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  // Check if user is logged in on component mount
  useEffect(() => {
    // Check if barber info exists in localStorage
    const storedBarberInfo = localStorage.getItem("barberInfo")

    if (storedBarberInfo) {
      const parsedInfo = JSON.parse(storedBarberInfo)
      setBarberInfo(parsedInfo)
      setIsLoggedIn(true)

      // Join barber's room for real-time updates
      if (socketRef.current) {
        const barberName = parsedInfo.name || barbername
        socketRef.current.emit("join", { type: "barber", name: barberName })

        // Listen for new appointments
        socketRef.current.on("new_appointment", (appointment) => {
          console.log("New appointment received:", appointment)
          // Add to pending appointments
          setPendingAppointments((prev) => [...prev, appointment])
          // Show alert
          setNewAppointmentAlert(true)
          // Auto-hide alert after 5 seconds
          setTimeout(() => {
            setNewAppointmentAlert(false)
          }, 5000)
        })
      }

      // Fetch appointments for this barber
      fetchAppointments(parsedInfo.name || barbername)
    } else if (!barbername) {
      // If no barber info in localStorage and no barbername in URL, redirect to login
      navigate("/barberSignIn")
    } else {
      // If barbername is in URL but no localStorage, fetch appointments for that barber
      fetchAppointments(barbername)

      // Join barber's room for real-time updates
      if (socketRef.current) {
        socketRef.current.emit("join", { type: "barber", name: barbername })
      }
    }
  }, [barbername, navigate])

  // Fetch appointments for the barber
  const fetchAppointments = async (barberName) => {
    if (!barberName) return

    try {
      setLoading(true)
      const response = await fetch(`http://localhost:4000/barber-appointments/${barberName}`)

      if (!response.ok) {
        throw new Error("Failed to fetch appointments")
      }

      const data = await response.json()
      setPendingAppointments(data.pendingAppointments || [])
      setConfirmedAppointments(data.confirmedAppointments || [])
      setLoading(false)
    } catch (err) {
      console.error("Error fetching appointments:", err)
      setError("Failed to load appointments. Please try again.")
      setLoading(false)
    }
  }

  const handleLogout = () => {
    // Clear barber info from localStorage
    localStorage.removeItem("barberInfo")
    setIsLoggedIn(false)
    setBarberInfo(null)
    // Redirect to login page
    navigate("/barberSignIn")
  }

  const handleAccept = async (id) => {
    try {
      const response = await fetch(`http://localhost:4000/appointments/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to approve appointment")
      }

      const updatedAppointment = await response.json()

      // Update the local state
      setPendingAppointments(pendingAppointments.filter((app) => app._id !== id))
      setConfirmedAppointments([...confirmedAppointments, updatedAppointment])

      alert("Appointment approved successfully!")
    } catch (error) {
      console.error("Error approving appointment:", error)
      alert("Failed to approve appointment. Please try again.")
    }
  }

  const handleReject = async (id) => {
    try {
      const response = await fetch(`http://localhost:4000/appointments/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to reject appointment")
      }

      // Update the local state
      setPendingAppointments(pendingAppointments.filter((app) => app._id !== id))

      alert("Appointment rejected successfully!")
    } catch (error) {
      console.error("Error rejecting appointment:", error)
      alert("Failed to reject appointment. Please try again.")
    }
  }

  // If not logged in and no barbername, show loading or redirect
  if (!isLoggedIn && !barbername) {
    return <div className="min-h-screen flex items-center justify-center">Redirecting to login...</div>
  }

  const currentBarberName = barbername || (barberInfo && barberInfo.name) || "Barber"

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* New Appointment Alert */}
      {newAppointmentAlert && (
        <div className="fixed top-4 right-4 z-50 bg-white border border-green-200 shadow-lg rounded-lg p-4 max-w-md">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-full p-2 mr-3">
              <FaCalendar className="text-green-600 h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">New Appointment Request!</p>
              <p className="text-sm text-gray-600">You have a new booking request. Check your pending appointments.</p>
            </div>
            <button onClick={() => setNewAppointmentAlert(false)} className="ml-4 text-gray-400 hover:text-gray-600">
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 font-bold text-xl">
              <span>CutNStyle</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2">
                <FaUserCircle className="h-5 w-5 text-gray-600" />
                <span className="font-medium">{currentBarberName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - desktop only */}
        <div className="hidden md:flex w-64 flex-col border-r bg-white">
          <div className="p-4">
            <div className="flex items-center gap-3 p-3 rounded-md bg-blue-50 text-blue-700">
              <FaCalendar className="h-5 w-5" />
              <span className="font-medium">Dashboard</span>
            </div>
            <div
              onClick={() => navigate(`/profile?barbername=${currentBarberName}`)}
              className="mt-2 flex items-center gap-3 p-3 rounded-md hover:bg-gray-100 cursor-pointer"
            >
              <FaUserCircle className="h-5 w-5 text-gray-500" />
              <span>Profile</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Barber Dashboard</h1>
              <p className="text-gray-600">Welcome back, {currentBarberName}</p>
            </div>

            <div className="mt-4 sm:mt-0">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Today:</span>{" "}
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="bg-white rounded-lg border p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-500">Today's Appointments</div>
              <div className="mt-1 text-2xl font-bold">
                {
                  confirmedAppointments.filter((app) => new Date(app.date).toDateString() === new Date().toDateString())
                    .length
                }
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-500">Pending Requests</div>
              <div className="mt-1 text-2xl font-bold">{pendingAppointments.length}</div>
            </div>

            <div className="bg-white rounded-lg border p-4 shadow-sm">
              <div className="text-sm font-medium text-gray-500">Total Appointments</div>
              <div className="mt-1 text-2xl font-bold">{pendingAppointments.length + confirmedAppointments.length}</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="flex border-b">
              <button
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === "pending"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab("pending")}
              >
                Pending Requests ({pendingAppointments.length})
              </button>
              <button
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === "confirmed"
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                onClick={() => setActiveTab("confirmed")}
              >
                Confirmed Appointments ({confirmedAppointments.length})
              </button>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">{error}</div>
              ) : activeTab === "pending" ? (
                pendingAppointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No pending appointment requests</div>
                ) : (
                  <div className="space-y-4">
                    {pendingAppointments.map((appointment) => (
                      <div key={appointment._id} className="border rounded-lg p-4">
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <h3 className="font-medium">{appointment.customerName}</h3>
                            <p className="text-sm text-gray-500">{appointment.phone}</p>
                            <p className="text-sm text-gray-500">{appointment.email}</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <FaCalendar className="h-4 w-4 text-gray-400" />
                              <span>{appointment.date}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <FaClock className="h-4 w-4 text-gray-400" />
                              <span>{appointment.time}</span>
                            </div>
                          </div>
                          <div>
                            <p className="font-medium">{appointment.service}</p>
                            {appointment.notes && (
                              <p className="text-sm text-gray-500 mt-1">Note: {appointment.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                          <button
                            onClick={() => handleReject(appointment._id)}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 rounded-md hover:bg-red-50"
                          >
                            <FaTimes className="inline-block mr-1 h-3 w-3" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleAccept(appointment._id)}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                          >
                            <FaCheck className="inline-block mr-1 h-3 w-3" />
                            Accept
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : confirmedAppointments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No confirmed appointments</div>
              ) : (
                <div className="space-y-4">
                  {confirmedAppointments.map((appointment) => (
                    <div key={appointment._id} className="border rounded-lg p-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <h3 className="font-medium">{appointment.customerName}</h3>
                          <p className="text-sm text-gray-500">{appointment.phone}</p>
                          <p className="text-sm text-gray-500">{appointment.email}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <FaCalendar className="h-4 w-4 text-gray-400" />
                            <span>{appointment.date}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <FaClock className="h-4 w-4 text-gray-400" />
                            <span>{appointment.time}</span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">{appointment.service}</p>
                          {appointment.notes && <p className="text-sm text-gray-500 mt-1">Note: {appointment.notes}</p>}
                          <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Confirmed
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BarberPage

