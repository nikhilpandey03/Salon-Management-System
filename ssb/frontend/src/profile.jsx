"use client"

import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { FaUserCircle, FaPhone, FaEnvelope, FaStore, FaMapMarkerAlt, FaCalendarAlt, FaArrowLeft } from "react-icons/fa"
import { GiScissors } from "react-icons/gi"

function BarberProfile() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryParams = new URLSearchParams(location.search)
  const barberName = queryParams.get("barbername") // Extract "barbername" from URL

  const [barberInfo, setBarberInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check if barber info exists in localStorage
    const storedBarberInfo = localStorage.getItem("barberInfo")

    if (storedBarberInfo) {
      const parsedInfo = JSON.parse(storedBarberInfo)
      setBarberInfo(parsedInfo)
      setLoading(false)
    } else if (barberName) {
      // Fetch barber info from API using the name
      fetchBarberInfo(barberName)
    } else {
      // If no barber info in localStorage and no barbername in URL, redirect to login
      navigate("/barberSignIn")
    }
  }, [barberName, navigate])

  const fetchBarberInfo = async (name) => {
    try {
      setLoading(true)
      // Get all barbers and find the one with matching name
      const response = await fetch("http://localhost:4000/barbers")

      if (!response.ok) {
        throw new Error("Failed to fetch barber information")
      }

      const barbers = await response.json()
      const barber = barbers.find(b => b.name === name)
      
      if (barber) {
        setBarberInfo(barber)
      } else {
        setError("Barber not found")
      }
      
      setLoading(false)
    } catch (err) {
      console.error("Error fetching barber info:", err)
      setError("Failed to load barber information. Please try again.")
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate("/barber")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={() => navigate("/barber")} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2 font-bold text-xl">
              <GiScissors className="h-6 w-6 text-blue-600" />
              <span>CutNStyle</span>
            </div>

            <button
              onClick={handleBack}
              className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              <FaArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Profile Header */}
            <div className="bg-blue-600 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center text-blue-600">
                  <FaUserCircle className="h-16 w-16" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{barberInfo?.name || "Barber Profile"}</h1>
                  <p className="text-blue-100">{barberInfo?.role || barberInfo?.experience || "Professional Barber"}</p>
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h2 className="text-lg font-medium border-b pb-2">Personal Information</h2>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <FaUserCircle className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Full Name</p>
                        <p className="font-medium">{barberInfo?.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <FaEnvelope className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{barberInfo?.email}</p>
                      </div>
                    </div>
                    
                    {/* <div className="flex items-center gap-3">
                      <FaPhone className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">{barberInfo?.phone}</p>
                      </div>
                    </div> */}
                  </div>
                </div>

                {/* Shop Information */}
                <div className="space-y-4">
                  <h2 className="text-lg font-medium border-b pb-2">Shop Information</h2>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <FaStore className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Shop Name</p>
                        <p className="font-medium">{barberInfo?.shopName}</p>
                      </div>
                    </div>
                    
                    {barberInfo?.address && (
                      <div className="flex items-start gap-3">
                        <FaMapMarkerAlt className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="font-medium">{barberInfo.address}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* <div className="flex items-center gap-3">
                      <FaCalendarAlt className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Experience</p>
                        <p className="font-medium">{barberInfo?.experience}</p>
                      </div>
                    </div> */}
                  </div>
                </div>
              </div>

              {/* Specialties */}
              {barberInfo?.specialties && barberInfo.specialties.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h2 className="text-lg font-medium border-b pb-2">Specialties</h2>
                  <div className="flex flex-wrap gap-2">
                    {barberInfo.specialties.map((specialty) => (
                      <span 
                        key={specialty} 
                        className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 py-6 text-gray-300 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} CutNStyle Barber Shop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default BarberProfile
