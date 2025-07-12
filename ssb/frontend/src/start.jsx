import React, { useState } from 'react'
import { /*FaScissors*/ FaUser, FaCalendar } from 'react-icons/fa'
import { Link } from "react-router-dom"

function Start() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <div className="flex justify-center items-center flex-col gap-2 font-bold text-xl text-blue-600">
              {/* <FaScissors className="h-6 w-6" /> */}
              <img src="logo.jpeg" alt="" className="h-[25%] w-[25%]"/>
              <span>CutNStyle</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Welcome to CutNStyle</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl">Choose how you want to use our service</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl w-full">
          {/* Customer Option */}
          <div className="group cursor-pointer">
            <div className="h-full rounded-lg border-2 border-gray-200 p-8 text-center transition-all hover:border-blue-500 hover:shadow-md flex flex-col items-center justify-center">
              <div className="mb-4 rounded-full bg-blue-100 p-4 group-hover:bg-blue-200">
                <FaUser className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold">I'm a Customer</h2>
              <p className="mt-4 text-gray-600">Book appointments, browse services, and connect with our barbers.</p>
              <Link to="/customer">
                <button className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  Continue as Customer
                </button>
              </Link>
            </div>
          </div>

          {/* Barber Option */}
          <div className="group cursor-pointer">
            <div className="h-full rounded-lg border-2 border-gray-200 p-8 text-center transition-all hover:border-blue-500 hover:shadow-md flex flex-col items-center justify-center">
              <div className="mb-4 rounded-full bg-blue-100 p-4 group-hover:bg-blue-200">
                <FaCalendar className="h-10 w-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold">I'm a Barber</h2>
              <p className="mt-4 text-gray-600">
                Manage appointments, view your schedule, and update your availability.
              </p>
              <Link to= "/barberSignIn">
              <button className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Continue as Barber
              </button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 py-6 text-gray-300">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 font-bold text-xl text-white mb-4">
            {/* <FaScissors className="h-6 w-6" /> */}
            <span>CutNStyle</span>
          </div>
          <p>&copy; {new Date().getFullYear()} CutNStyle Barber Shop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default Start