import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { User, Lock, Mail, Facebook, Twitter, Chrome } from 'lucide-react'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  // Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('') // For signup
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) throw error
        navigate('/')
      } else {
        const { data, error } = await signUp(email, password, fullName)
        if (error) throw error
        if (data?.user && !data.session) {
          alert('Please check your email to confirm your account.')
          setIsLogin(true)
        } else {
          navigate('/')
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Social Icons (Placeholders for now)
  const SocialButton = ({ icon: Icon, color }) => (
    <button
      type="button"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm transition-transform hover:scale-110 hover:shadow-md"
      style={{ color }}
    >
      <Icon size={20} fill="currentColor" className="opacity-90" />
    </button>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-cyan-400 via-purple-600 to-pink-500 p-4">
      <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white p-10 shadow-2xl">

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-800">
            {isLogin ? 'Login' : 'Sign Up'}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded bg-red-50 p-2 text-center text-sm text-red-600">
              {error}
            </div>
          )}

          {!isLogin && (
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full border-b border-gray-300 py-3 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
          )}

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              placeholder="Type your username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-b border-gray-300 py-3 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              required
            />
            <label className="absolute -top-3 left-0 text-xs text-gray-500">Username</label>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              placeholder="Type your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-b border-gray-300 py-3 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              required
            />
            <label className="absolute -top-3 left-0 text-xs text-gray-500">Password</label>
          </div>

          <div className="text-right">
            <a href="#" className="text-xs text-gray-500 hover:text-purple-600">Forgot password?</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-600 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-gradient-to-l hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        {/* Social Login */}
        <div className="mt-8 text-center">
          <p className="mb-4 text-xs text-gray-500">Or {isLogin ? 'Sign Up' : 'Login'} Using</p>
          <div className="flex justify-center gap-4">
            <SocialButton icon={Facebook} color="#3b5998" />
            <SocialButton icon={Twitter} color="#1da1f2" />
            <SocialButton icon={Chrome} color="#db4437" />
          </div>
        </div>

        {/* Footer Toggle */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-500">
            {isLogin ? "Or Sign Up Using" : "Or Login Using"}
          </p>
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
            }}
            className="mt-2 text-sm font-bold uppercase text-gray-700 hover:text-purple-600"
          >
            {isLogin ? 'SIGN UP' : 'LOGIN'}
          </button>
        </div>

      </div>
    </div>
  )
}
