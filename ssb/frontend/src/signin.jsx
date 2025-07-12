"use client"

import { useState } from "react"
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa"
import { useNavigate } from "react-router-dom"

function SignIn() {
  const [barbername, setBarberName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleSignin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Send login request to server
      const response = await fetch("http://localhost:4000/barber-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ barbername, password }),
      })

      if (response.ok) {
        const barberData = await response.json()

        // Store barber info in localStorage for persistence
        localStorage.setItem(
          "barberInfo",
          JSON.stringify({
            id: barberData.id,
            name: barberData.firstName + " " + barberData.lastName,
            email: barberData.email,
            shopName: barberData.shopName,
          }),
        )

        // Navigate to barber dashboard with name as query param
        navigate(`/barber?barbername=${barberData.firstName} ${barberData.lastName}`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Invalid username or password")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("Server error. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            <span>CutNStyle</span>
          </div>
          <a href="/" className="text-sm font-medium text-gray-600 hover:text-blue-600">
            Back to Home
          </a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-lg border bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold">Barber Login</h1>
              <p className="mt-2 text-gray-600">Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleSignin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium">
                  Name or Email
                </label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="barbername"
                    name="barbername"
                    type="text"
                    placeholder="Barber's Name or Email"
                    className="pl-10 w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={barbername}
                    onChange={(e) => setBarberName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <FaLock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="pl-10 pr-10 w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-blue-600 py-2 px-4 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <button onClick={() => navigate("/create-account")} className="text-blue-600 hover:underline">
                  Create account
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 py-6 text-gray-300">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} CutNStyle Barber Shop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default SignIn

