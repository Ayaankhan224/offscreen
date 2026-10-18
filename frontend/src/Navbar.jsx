import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

const Navbar = () => {
  const { user, hasSurvey, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogoClick = (e) => {
    e.preventDefault()
    if (!user) {
      navigate('/')
    } else if (hasSurvey) {
      navigate('/recommender')
    } else {
      navigate('/survey')
    }
  }

  const handleLibraryClick = (e) => {
    if (!user) {
      e.preventDefault()
      navigate('/signup?redirect=/library')
    }
  }

  return (
    <header className='text-zinc-200 w-full h-[14%] shrink-0 flex items-center justify-between font-[asul] px-8 py-3 select-none border-b border-zinc-900/40'>
      <div className='flex items-center gap-4'>
        <a href='/' onClick={handleLogoClick} className='flex items-center gap-3 group'>
          <img
            src="/assets/logo.png"
            alt="OffScreen logo"
            className='h-14 w-auto object-contain transition-transform group-hover:scale-105'
          />
          <span className='text-4xl sm:text-5xl tracking-widest text-zinc-100 font-bold'>
            SCREEN
          </span>
        </a>
      </div>

      <nav className='flex items-center gap-6 sm:gap-9 text-xs sm:text-sm tracking-widest'>
        <Link to='/about' className='underline-slide py-1 text-zinc-300 hover:text-white transition-colors'>
          ABOUT
        </Link>
        <a href='https://github.com/Ayaankhan224/fable' target='_blank' rel='noopener noreferrer' className='underline-slide py-1 text-zinc-300 hover:text-white transition-colors'>
          SOURCE
        </a>
        <Link
          to='/library'
          onClick={handleLibraryClick}
          className='underline-slide py-1 text-zinc-300 hover:text-white transition-colors'
        >
          LIBRARY
        </Link>

        {user ? (
          <div className='flex items-center gap-3'>
            <span className='hidden md:inline-block text-xs text-zinc-400 font-mono max-w-[130px] truncate'>
              {user.email}
            </span>
            <button
              type='button'
              onClick={() => {
                logout()
                navigate('/')
              }}
              className='h-7 px-4 flex justify-center cursor-pointer items-center border border-zinc-700 bg-zinc-900 text-zinc-200 rounded-full hover:bg-white hover:text-black hover:border-white transition-colors text-xs'
            >
              LOGOUT
            </button>
          </div>
        ) : (
          <Link
            to='/signup'
            className='w-24 h-7 flex justify-center cursor-pointer items-center bg-zinc-200 border-2 border-zinc-200 text-black rounded-full hover:bg-black hover:text-zinc-200 transition-colors text-xs font-medium'
          >
            SIGN-UP
          </Link>
        )}
      </nav>
    </header>
  )
}

export default Navbar
