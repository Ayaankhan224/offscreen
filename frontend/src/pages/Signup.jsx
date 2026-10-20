import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const posterImages = [
  'littleWomen.png', 'AOT.png', 'tenet.png', 'darkKnightRises.png', 'arcane.png', 'Rango.png',
  'theExorcist.png', 'dogDayAfternoon.png', 'Clayface.png', 'chernobyl.png', 'theUsualSuspects.png',
  'primetime.png', 'taxiDriver.png', 'bb.png', 'avengers.png', 'youCanSeeEverything.png', 'hamnet.png', 'arrival.png',
]

const Signup = () => {
  const [mode, setMode] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [poster] = useState(() => posterImages[Math.floor(Math.random() * posterImages.length)])

  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const isSignup = mode === 'signup'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignup) {
        await register(email, password)
        // Brand new user -> always go to survey unless specified otherwise
        const redirect = searchParams.get('redirect')
        if (redirect && redirect !== '/recommender') {
          navigate(redirect)
        } else {
          navigate('/survey')
        }
      } else {
        const result = await login(email, password)
        const redirect = searchParams.get('redirect')
        if (redirect) {
          navigate(redirect)
        } else if (result.hasSurvey) {
          navigate('/recommender')
        } else {
          navigate('/survey')
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='flex min-h-0 flex-1 items-center justify-center overflow-hidden px-5 py-3 text-zinc-100'>
      <section className='grid w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 md:grid-cols-2'>
        <div className='relative hidden min-h-0 flex-col justify-between overflow-hidden bg-zinc-900 p-8 md:flex'>
          <img
            src={`/assets/homePosters/${poster}`}
            alt=''
            aria-hidden='true'
            className='absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-sm'
          />
          <div className='absolute inset-0 bg-black/55' />
          <div className='relative font-[asul] text-2xl tracking-[0.2em]'>OFFSCREEN</div>
          <div className='relative max-w-sm'>
            <p className='mb-4 text-xs uppercase tracking-[0.28em] text-zinc-400'>A place for your next favorite</p>
            <h1 className='font-[asul] text-5xl leading-[1.05]'>Find stories that stay with you.</h1>
            <p className='mt-5 max-w-xs text-sm leading-6 text-zinc-400'>
              Keep your watchlist close, track what you watch, and discover cinematic gems tailored directly to your taste.
            </p>
          </div>
          <p className='relative text-xs text-zinc-500'>© OffScreen Cinema Discovery</p>
        </div>

        <div className='flex items-center justify-center p-6 sm:p-8'>
          <div className='w-full max-w-sm'>
            <Link to='/' className='mb-5 inline-block text-sm text-zinc-400 transition hover:text-white'>
              ← Back to home
            </Link>
            <p className='mb-2 text-xs uppercase tracking-[0.24em] text-zinc-500'>Welcome to OffScreen</p>
            <h2 className='font-[asul] text-4xl'>{isSignup ? 'Create account' : 'Welcome back'}</h2>

            <div className='mt-5 grid grid-cols-2 rounded-full border border-zinc-800 bg-black p-1 text-sm'>
              <button
                type='button'
                onClick={() => {
                  setMode('signup')
                  setError('')
                }}
                className={`rounded-full py-2 cursor-pointer transition ${isSignup ? 'bg-zinc-100 text-black font-medium' : 'text-zinc-400 hover:text-white'}`}
              >
                Sign up
              </button>
              <button
                type='button'
                onClick={() => {
                  setMode('login')
                  setError('')
                }}
                className={`rounded-full py-2 cursor-pointer transition ${!isSignup ? 'bg-zinc-100 text-black font-medium' : 'text-zinc-400 hover:text-white'}`}
              >
                Log in
              </button>
            </div>

            {error && (
              <div className='mt-4 rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-300'>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className='mt-4 space-y-3'>
              {isSignup && (
                <label className='block text-sm text-zinc-300'>
                  Name
                  <input
                    autoComplete='name'
                    type='text'
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder='Your name'
                    className='mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-500'
                  />
                </label>
              )}
              <label className='block text-sm text-zinc-300'>
                Email
                <input
                  required
                  autoComplete='email'
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='you@example.com'
                  className='mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-500'
                />
              </label>
              <label className='block text-sm text-zinc-300'>
                Password
                <input
                  required
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  minLength={8}
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='At least 8 characters'
                  className='mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-500'
                />
              </label>
              <button
                type='submit'
                disabled={loading}
                className='mt-2 w-full cursor-pointer rounded-full bg-zinc-100 py-3 text-sm font-semibold text-black transition hover:bg-white disabled:opacity-50'
              >
                {loading ? 'Please wait...' : isSignup ? 'Create account' : 'Log in'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Signup
