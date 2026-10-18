import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IoIosRefresh, IoMdTrash } from 'react-icons/io'
import { IoCheckmarkCircle } from 'react-icons/io5'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

const POSTER_FILES = [
  'littleWomen.png', 'AOT.png', 'tenet.png', 'darkKnightRises.png', 'arcane.png', 'Rango.png',
  'theExorcist.png', 'dogDayAfternoon.png', 'Clayface.png', 'chernobyl.png', 'theUsualSuspects.png',
  'primetime.png', 'taxiDriver.png', 'bb.png', 'avengers.png', 'youCanSeeEverything.png', 'hamnet.png', 'arrival.png',
]

const getPosterForMovie = (movie, index) => {
  if (movie.poster_url) return movie.poster_url
  const title = movie.title.toLowerCase()
  const match = [
    ['little women', 'littleWomen.png'], ['attack on titan', 'AOT.png'], ['tenet', 'tenet.png'],
    ['dark knight', 'darkKnightRises.png'], ['arcane', 'arcane.png'], ['rango', 'Rango.png'],
    ['exorcist', 'theExorcist.png'], ['dog day', 'dogDayAfternoon.png'], ['clayface', 'Clayface.png'],
    ['chernobyl', 'chernobyl.png'], ['usual suspects', 'theUsualSuspects.png'], ['primetime', 'primetime.png'],
    ['taxi driver', 'taxiDriver.png'], ['breaking bad', 'bb.png'], ['avenger', 'avengers.png'],
    ['everything', 'youCanSeeEverything.png'], ['hamnet', 'hamnet.png'], ['arrival', 'arrival.png'],
  ].find(([key]) => title.includes(key))
  return `/assets/homePosters/${match?.[1] || POSTER_FILES[index % POSTER_FILES.length]}`
}

const Library = () => {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('watched')
  const [library, setLibrary] = useState({ watched: [], watchlist: [], reviews: [] })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  const fetchLibrary = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getLibrary()
      setLibrary(data || { watched: [], watchlist: [], reviews: [] })
    } catch (err) {
      console.error('Failed to load library:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/signup?redirect=/library')
      } else {
        fetchLibrary()
      }
    }
  }, [user, authLoading, navigate, fetchLibrary])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Handle removing from watched
  const handleRemoveWatched = async (movieTitle) => {
    try {
      await api.toggleWatched(movieTitle)
      setLibrary((prev) => ({
        ...prev,
        watched: prev.watched.filter((m) => m.title !== movieTitle),
      }))
      showToast(`Removed "${movieTitle}" from Watched`)
    } catch (err) {
      console.error('Failed to remove from watched:', err)
    }
  }

  // Handle removing from watchlist
  const handleRemoveWatchlist = async (movieTitle) => {
    try {
      await api.toggleWatchlist(movieTitle)
      setLibrary((prev) => ({
        ...prev,
        watchlist: prev.watchlist.filter((m) => m.title !== movieTitle),
      }))
      showToast(`Removed "${movieTitle}" from Watchlist`)
    } catch (err) {
      console.error('Failed to remove from watchlist:', err)
    }
  }

  // Handle marking watchlist movie as watched
  const handleMarkWatchedFromWatchlist = async (movie) => {
    try {
      await api.toggleWatched(movie.title)
      setLibrary((prev) => ({
        ...prev,
        watchlist: prev.watchlist.filter((m) => m.title !== movie.title),
        watched: [{ ...movie, is_watched: true }, ...prev.watched],
      }))
      showToast(`Moved "${movie.title}" to Watched`)
    } catch (err) {
      console.error('Failed to move to watched:', err)
    }
  }

  const currentList = activeTab === 'watched' ? library.watched : library.watchlist

  if (loading || authLoading) {
    return (
      <div className='flex h-full w-full items-center justify-center text-zinc-400'>
        <div className='flex flex-col items-center gap-3 font-[asul]'>
          <IoIosRefresh className='animate-spin text-3xl text-zinc-200' />
          <p className='text-xs uppercase tracking-widest'>Loading your cinema library...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='relative flex h-full w-full flex-col p-6 select-none overflow-hidden text-zinc-100'>
      {/* Toast Notification */}
      {toast && (
        <div className='absolute top-4 left-1/2 -translate-x-1/2 z-30 rounded-full border border-zinc-700 bg-zinc-900 px-5 py-2 text-xs text-zinc-200 shadow-2xl'>
          {toast}
        </div>
      )}

      {/* Header and Pill Toggle */}
      <div className='flex shrink-0 items-center justify-between pb-6 border-b border-zinc-900'>
        <div>
          <p className='text-xs uppercase tracking-[0.25em] text-zinc-500 font-mono'>
            Your Personal Collection
          </p>
          <h1 className='font-[asul] text-3xl sm:text-4xl text-white mt-1'>
            {activeTab === 'watched' ? 'Watched Films' : 'Watchlist Queue'}
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className='relative w-64 h-10 border border-zinc-700 bg-zinc-950 rounded-full p-1 flex items-center text-xs tracking-wider'>
          <span
            aria-hidden='true'
            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-zinc-100 transition-transform duration-300 ${
              activeTab === 'watchlist' ? 'translate-x-full' : ''
            }`}
          />
          <button
            type='button'
            onClick={() => setActiveTab('watched')}
            aria-pressed={activeTab === 'watched'}
            className={`relative z-10 flex-1 h-full rounded-full cursor-pointer font-medium transition-colors ${
              activeTab === 'watched' ? 'text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            WATCHED ({library.watched.length})
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('watchlist')}
            aria-pressed={activeTab === 'watchlist'}
            className={`relative z-10 flex-1 h-full rounded-full cursor-pointer font-medium transition-colors ${
              activeTab === 'watchlist' ? 'text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            WATCHLIST ({library.watchlist.length})
          </button>
        </div>
      </div>

      {/* Grid of Movies */}
      <div className='flex-1 overflow-y-auto py-6 pr-2'>
        {currentList.length === 0 ? (
          <div className='flex h-full flex-col items-center justify-center text-center'>
            <p className='text-zinc-500 font-[asul] text-2xl'>
              {activeTab === 'watched'
                ? 'No watched movies recorded yet.'
                : 'Your watchlist is currently empty.'}
            </p>
            <p className='mt-2 text-xs text-zinc-500 max-w-sm'>
              {activeTab === 'watched'
                ? 'Mark movies as watched on the recommender page or write reviews to start building your film journal.'
                : 'Save films you want to explore later by clicking the heart button on any recommendation.'}
            </p>
            <Link
              to='/recommender'
              className='mt-6 rounded-full bg-zinc-100 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-black hover:bg-white transition'
            >
              Discover Recommendations →
            </Link>
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
            {currentList.map((movie, idx) => {
              return (
                <div
                  key={movie.movieId || movie.title}
                  className='group relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900 shadow-lg shadow-black/20'
                >
                  <img
                    src={getPosterForMovie(movie, idx)}
                    alt=''
                    aria-hidden='true'
                    className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-105'
                    onError={(event) => {
                      event.currentTarget.onerror = null
                      event.currentTarget.src = `/assets/homePosters/${POSTER_FILES[idx % POSTER_FILES.length]}`
                    }}
                  />
                  <div className='absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100' />
                  <h3 className='absolute inset-x-3 bottom-3 translate-y-2 text-center font-[asul] text-sm leading-tight text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100'>
                    {movie.title}
                  </h3>
                  <div className='absolute right-2 top-2 flex flex-col gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100'>
                    {activeTab === 'watchlist' && (
                      <button
                        type='button'
                        onClick={() => handleMarkWatchedFromWatchlist(movie)}
                        className='cursor-pointer rounded-full bg-black/65 p-2 text-emerald-300 backdrop-blur transition hover:bg-black'
                        title='Mark as watched'
                        aria-label={`Mark ${movie.title} as watched`}
                      >
                        <IoCheckmarkCircle />
                      </button>
                    )}
                    <button
                      type='button'
                      onClick={() => activeTab === 'watchlist' ? handleRemoveWatchlist(movie.title) : handleRemoveWatched(movie.title)}
                      className='cursor-pointer rounded-full bg-black/65 p-2 text-white/80 backdrop-blur transition hover:bg-black hover:text-rose-300'
                      title={activeTab === 'watchlist' ? 'Remove from watchlist' : 'Remove from watched'}
                      aria-label={`Remove ${movie.title} from ${activeTab}`}
                    >
                      <IoMdTrash className='text-base' />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Library
