import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoIosRefresh, IoIosHeart, IoIosHeartEmpty, IoIosStar, IoIosStarOutline } from 'react-icons/io'
import { IoCheckmarkCircle, IoCheckmarkCircleOutline } from 'react-icons/io5'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

const DEFAULT_PALETTE = ['#8b5cf6', '#0ea5e9', '#f43f5e', '#ffffff', '#f59e0b', '#10b981', '#6366f1']

const POSTER_FILES = [
  'littleWomen.png',
  'AOT.png',
  'tenet.png',
  'darkKnightRises.png',
  'arcane.png',
  'Rango.png',
  'theExorcist.png',
  'dogDayAfternoon.png',
  'Clayface.png',
  'chernobyl.png',
  'theUsualSuspects.png',
  'primetime.png',
  'taxiDriver.png',
  'bb.png',
  'avengers.png',
  'youCanSeeEverything.png',
  'hamnet.png',
  'arrival.png',
]

const getPosterForMovie = (movie, index) => {
  if (!movie || !movie.title) return `/assets/homePosters/${POSTER_FILES[0]}`
  const t = movie.title.toLowerCase()
  if (t.includes('little women')) return '/assets/homePosters/littleWomen.png'
  if (t.includes('attack on titan') || t.includes('aot')) return '/assets/homePosters/AOT.png'
  if (t.includes('tenet')) return '/assets/homePosters/tenet.png'
  if (t.includes('dark knight')) return '/assets/homePosters/darkKnightRises.png'
  if (t.includes('arcane')) return '/assets/homePosters/arcane.png'
  if (t.includes('rango')) return '/assets/homePosters/Rango.png'
  if (t.includes('exorcist')) return '/assets/homePosters/theExorcist.png'
  if (t.includes('dog day')) return '/assets/homePosters/dogDayAfternoon.png'
  if (t.includes('clayface')) return '/assets/homePosters/Clayface.png'
  if (t.includes('chernobyl')) return '/assets/homePosters/chernobyl.png'
  if (t.includes('usual suspects')) return '/assets/homePosters/theUsualSuspects.png'
  if (t.includes('primetime')) return '/assets/homePosters/primetime.png'
  if (t.includes('taxi driver')) return '/assets/homePosters/taxiDriver.png'
  if (t.includes('breaking bad')) return '/assets/homePosters/bb.png'
  if (t.includes('avenger')) return '/assets/homePosters/avengers.png'
  if (t.includes('everything')) return '/assets/homePosters/youCanSeeEverything.png'
  if (t.includes('hamnet')) return '/assets/homePosters/hamnet.png'
  if (t.includes('arrival')) return '/assets/homePosters/arrival.png'

  const hash = Math.abs(
    (movie.movieId || 0) + (index || 0) * 11 + movie.title.charCodeAt(0)
  )
  return `/assets/homePosters/${POSTER_FILES[hash % POSTER_FILES.length]}`
}

const Recommender = () => {
  const { user, hasSurvey, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [movies, setMovies] = useState([])
  const [selectedMovie, setSelectedMovie] = useState(0)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  const [moviePosters, setMoviePosters] = useState({})

  // Review state
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(5)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewFeedback, setReviewFeedback] = useState('')

  // Action states
  const [actionMessage, setActionMessage] = useState('')

  // Check authentication & survey status
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/signup?redirect=/recommender')
      } else if (!hasSurvey) {
        navigate('/survey')
      }
    }
  }, [user, hasSurvey, authLoading, navigate])

  const fetchRecommendations = useCallback(async (count = 0) => {
    try {
      setRefreshing(true)
      const data = await api.getUserRecommendations(count)
      const recs = (data?.recommendations || []).map((m, idx) => ({
        ...m,
        color: m.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length],
      }))
      setMovies(recs)
      setSelectedMovie(0)
    } catch (err) {
      console.error('Failed to fetch recommendations:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (user && hasSurvey) {
      fetchRecommendations(0)
    }
  }, [user, hasSurvey, fetchRecommendations])

  const handleRefresh = async () => {
    const nextCount = refreshCount + 1
    setRefreshCount(nextCount)
    await fetchRecommendations(nextCount)
    setActionMessage('Fresh recommendations curated based on your taste.')
    setTimeout(() => setActionMessage(''), 3000)
  }

  const movie = movies[selectedMovie] || {
    title: 'Discovering...',
    summary: 'Analyzing cinema database...',
    genres: '',
    year: null,
    average_rating: 4.0,
    color: '#8b5cf6',
    in_watchlist: false,
    is_watched: false,
    poster_url: null,
  }

  // Prefer already-provided poster URLs and otherwise use the app's local poster map.
  // This avoids browser CORS failures from third-party APIs while preserving the UI.
  useEffect(() => {
    if (!movie || !movie.title || movie.title === 'Discovering...') return

    const nextPoster = movie.poster_url && movie.poster_url !== 'N/A'
      ? movie.poster_url
      : getPosterForMovie(movie, selectedMovie)

    setMoviePosters((prev) => (
      prev[movie.title] === nextPoster ? prev : { ...prev, [movie.title]: nextPoster }
    ))
  }, [movie, selectedMovie])

  const handleMovieScroll = (event) => {
    if (movies.length === 0 || Math.abs(event.deltaY) < 2) return
    const direction = event.deltaY > 0 ? 1 : -1
    setSelectedMovie((current) => (current + direction + movies.length) % movies.length)
  }

  const handlePointerMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5
    setTilt({ x: -vertical * 24, y: horizontal * 24 })
  }

  // Toggle Watchlist
  const handleToggleWatchlist = async () => {
    if (!movie.title) return
    const willBeIn = !movie.in_watchlist

    // Optimistic UI update
    setMovies((prev) =>
      prev.map((m, idx) => (idx === selectedMovie ? { ...m, in_watchlist: willBeIn } : m))
    )

    try {
      await api.toggleWatchlist(movie.title)
      setActionMessage(willBeIn ? `Added "${movie.title}" to Watchlist` : `Removed from Watchlist`)
      setTimeout(() => setActionMessage(''), 3000)
    } catch (err) {
      console.error('Failed to toggle watchlist:', err)
      // Revert on error
      setMovies((prev) =>
        prev.map((m, idx) => (idx === selectedMovie ? { ...m, in_watchlist: !willBeIn } : m))
      )
    }
  }

  // Toggle Watched
  const handleToggleWatched = async () => {
    if (!movie.title) return
    const willBeWatched = !movie.is_watched

    // Optimistic UI update
    setMovies((prev) =>
      prev.map((m, idx) =>
        idx === selectedMovie
          ? {
              ...m,
              is_watched: willBeWatched,
              in_watchlist: willBeWatched ? false : m.in_watchlist,
            }
          : m
      )
    )

    try {
      await api.toggleWatched(movie.title)
      setActionMessage(willBeWatched ? `Marked "${movie.title}" as Watched` : `Removed from Watched`)
      setTimeout(() => setActionMessage(''), 3000)
    } catch (err) {
      console.error('Failed to toggle watched:', err)
      setMovies((prev) =>
        prev.map((m, idx) => (idx === selectedMovie ? { ...m, is_watched: !willBeWatched } : m))
      )
    }
  }

  // Submit Review
  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!reviewText.trim()) return

    setSubmittingReview(true)
    setReviewFeedback('')

    try {
      await api.submitReview(movie.title, reviewText.trim(), rating)

      // Automatically mark as watched
      setMovies((prev) =>
        prev.map((m, idx) =>
          idx === selectedMovie ? { ...m, is_watched: true, in_watchlist: false } : m
        )
      )

      setReviewFeedback('Review saved.')
      setReviewText('')

      // Refresh recommendations to incorporate new review signal
      setTimeout(async () => {
        await fetchRecommendations(refreshCount)
        setReviewFeedback('Saved.')
        setTimeout(() => setReviewFeedback(''), 4000)
      }, 1200)
    } catch (err) {
      setReviewFeedback(err.message || 'Failed to submit review.')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className='flex h-full w-full items-center justify-center text-zinc-400 font-[asul]'>
        <div className='flex flex-col items-center gap-4'>
          <IoIosRefresh className='animate-spin text-4xl text-zinc-100' />
          <p className='text-sm uppercase tracking-widest'>Curating your personalized 7 movies...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      onMouseMove={handlePointerMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      className='relative flex h-full w-full select-none overflow-hidden p-6 text-white'
    >
      {/* Toast Notification */}
      {actionMessage && (
        <div className='absolute top-4 left-1/2 -translate-x-1/2 z-30 rounded-full border border-zinc-700 bg-zinc-900 px-5 py-2 text-xs text-zinc-200 shadow-xl transition-all'>
          {actionMessage}
        </div>
      )}

      {/* LEFT COLUMN: 7 MOVIES LIST & REFRESH */}
      <div className='flex h-full w-[25%] flex-col justify-between pr-4'>
        <div>
          <p className='mb-3 text-[0.65rem] uppercase tracking-[0.24em] text-zinc-500 font-mono'>
            Top 7 CineMatch Picks
          </p>
          <div
            onWheel={handleMovieScroll}
            aria-label='Scroll to switch movies'
            className='flex max-h-[60vh] min-h-0 w-full flex-col gap-3.5 overflow-y-auto py-2 pr-2'
          >
            {movies.map((item, index) => {
              const isActive = selectedMovie === index
              return (
                <button
                  key={item.movieId || item.title}
                  type='button'
                  onClick={() => setSelectedMovie(index)}
                  aria-pressed={isActive}
                  className={`group flex items-center justify-between text-left transition-all cursor-pointer ${
                    isActive
                      ? 'text-xl sm:text-2xl text-white font-medium pl-3 border-l-2 border-white'
                      : 'text-zinc-500 hover:text-zinc-300 text-sm'
                  }`}
                >
                  <span className='truncate max-w-[200px]'>{item.title}</span>
                  {item.is_watched && (
                    <span className='text-[0.65rem] uppercase tracking-wider text-emerald-400 font-mono ml-2'>
                      Seen
                    </span>
                  )}
                  {item.in_watchlist && !item.is_watched && (
                    <span className='text-[0.65rem] uppercase tracking-wider text-rose-400 font-mono ml-2'>
                      Saved
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className='flex items-center gap-4 py-4 border-t border-zinc-900'>
          <button
            type='button'
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label='Refresh recommendations'
            className='flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-zinc-200 bg-zinc-200 text-black transition-colors hover:bg-black hover:text-zinc-200 disabled:opacity-50'
          >
            <IoIosRefresh
              aria-hidden='true'
              className={`text-3xl ${refreshing ? 'animate-spin' : ''}`}
            />
          </button>
          <div className='text-xs text-zinc-400'>
            <p className='font-semibold text-zinc-200'>Refresh Picks</p>
            <p className='text-[0.68rem] text-zinc-500'>Recalculate 7 new recommendations</p>
          </div>
        </div>
      </div>

      {/* CENTER COLUMN: 3D MOVIE POSTER & TITLE OUTSIDE */}
      <div className='flex h-full w-[50%] flex-col items-center justify-around px-4'>
        {/* Tilt Movie Poster - Just the movie poster with NOTHING written on it */}
        <div
          style={{
            transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.04)`,
          }}
          className='relative flex h-[68%] w-[50%] max-w-sm items-center justify-center overflow-hidden rounded-2xl shadow-2xl shadow-black/80 transition-transform duration-200 ease-out will-change-transform bg-zinc-950 border border-zinc-800'
        >
          <img
            src={moviePosters[movie.title] || movie.poster_url || getPosterForMovie(movie, selectedMovie)}
            alt=''
            className='h-full w-full object-cover select-none pointer-events-none transition-opacity duration-300'
            onError={(e) => {
              const fallback = getPosterForMovie(movie, selectedMovie)
              if (e.currentTarget.src !== fallback) {
                e.currentTarget.src = fallback
              }
            }}
          />
        </div>

        {/* Just the title outside the poster as it is */}
        <div className='w-full max-w-2xl px-6 text-center'>
          <h1 className='font-[asul] text-4xl sm:text-5xl uppercase tracking-wide text-zinc-100'>
            {movie.title}
          </h1>

          {/* Action Buttons: Heart (Watchlist) and Watched */}
          <div className='mt-4 flex items-center justify-center gap-3'>
            {/* Small Heart Button (Watchlist) */}
            <button
              type='button'
              onClick={handleToggleWatchlist}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium tracking-wider transition-colors cursor-pointer border ${
                movie.in_watchlist
                  ? 'border-rose-500 bg-rose-950/70 text-rose-200'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600 hover:text-white'
              }`}
              title={movie.in_watchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              {movie.in_watchlist ? (
                <IoIosHeart className='text-base text-rose-500' />
              ) : (
                <IoIosHeartEmpty className='text-base text-zinc-400' />
              )}
              <span>{movie.in_watchlist ? 'IN WATCHLIST' : 'WATCHLIST'}</span>
            </button>

            {/* Watched Button */}
            <button
              type='button'
              onClick={handleToggleWatched}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium tracking-wider transition-colors cursor-pointer border ${
                movie.is_watched
                  ? 'border-emerald-500 bg-emerald-950/70 text-emerald-200'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600 hover:text-white'
              }`}
              title={movie.is_watched ? 'Marked as Watched' : 'Mark Watched'}
            >
              {movie.is_watched ? (
                <IoCheckmarkCircle className='text-base text-emerald-400' />
              ) : (
                <IoCheckmarkCircleOutline className='text-base text-zinc-400' />
              )}
              <span>{movie.is_watched ? 'WATCHED' : 'MARK WATCHED'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: REVIEW & RATING */}
      <div className='flex h-full w-[25%] items-center justify-center pl-4'>
        <section className='w-full max-w-sm'>
          <h2 className='font-[asul] text-3xl font-bold text-zinc-100'>WATCHED?</h2>

          <form onSubmit={handleSubmitReview} className='mt-4 space-y-4'>
            {/* Star Rating selector */}
            <div>
              <div className='flex items-center gap-1'>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type='button'
                    onClick={() => setRating(star)}
                    className='cursor-pointer text-lg text-amber-400 hover:scale-110 transition-transform'
                    aria-label={`Rate ${star} star`}
                  >
                    {star <= rating ? <IoIosStar /> : <IoIosStarOutline className='text-zinc-600' />}
                  </button>
                ))}
                <span className='ml-2 text-xs font-mono text-zinc-400'>{rating}/5</span>
              </div>
            </div>

            {/* Review textarea */}
            <div>
              <label
                htmlFor='review'
                className='block text-[0.68rem] uppercase tracking-[0.16em] text-zinc-400'
              >
                Write a review
              </label>
              <textarea
                id='review'
                name='review'
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder='Write a review…'
                className='mt-2 h-28 w-full resize-none rounded-lg border border-zinc-800 bg-transparent p-3 text-sm leading-5 text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-zinc-500'
              />
            </div>

            {reviewFeedback && (
              <p className='text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl leading-normal'>
                {reviewFeedback}
              </p>
            )}

            <button
              type='submit'
              disabled={submittingReview || !reviewText.trim()}
              className='cursor-pointer flex h-8 w-20 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium tracking-wide text-black transition-colors hover:bg-white disabled:opacity-40'
            >
              {submittingReview ? 'SAVING' : 'SAVE'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

export default Recommender
