import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { IoIosSearch, IoMdClose, IoMdCheckmark } from 'react-icons/io'

const CURATED_POPULAR = [
  'Forrest Gump (1994)',
  'Shawshank Redemption, The (1994)',
  'Pulp Fiction (1994)',
  'Matrix, The (1999)',
  'Fight Club (1999)',
  'Toy Story (1995)',
  'Silence of the Lambs, The (1991)',
  'Star Wars: Episode IV - A New Hope (1977)',
  'Jurassic Park (1993)',
  'Dark Knight, The (2008)',
  'Interstellar (2014)',
  'Inception (2010)',
]

const ALL_GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Fantasy', 'Film-Noir', 'Horror',
  'Musical', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War', 'Western'
]

const Survey = () => {
  const { user, refreshProfile, setHasSurvey } = useAuth()
  const navigate = useNavigate()

  // Steps: 1: Movies, 2: Genres, 3: Taste Tuning
  const [step, setStep] = useState(1)

  // Survey State
  const [favoriteMovies, setFavoriteMovies] = useState([])
  const [favoriteGenres, setFavoriteGenres] = useState([])
  const [dislikedGenres, setDislikedGenres] = useState([])
  const [discoveryPreference, setDiscoveryPreference] = useState('balanced')

  // Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Redirect to signup if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/signup?redirect=/survey')
    }
  }, [user, navigate])

  // Live movie search with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await api.searchMovies(searchQuery.trim(), 8)
        setSearchResults(results)
      } catch (err) {
        console.error('Failed to search movies:', err)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const toggleFavoriteMovie = (movieTitle) => {
    setFavoriteMovies((prev) =>
      prev.includes(movieTitle)
        ? prev.filter((m) => m !== movieTitle)
        : [...prev, movieTitle]
    )
  }

  const toggleFavoriteGenre = (genre) => {
    setFavoriteGenres((prev) => {
      const exists = prev.includes(genre)
      if (exists) return prev.filter((g) => g !== genre)
      // Remove from disliked if selecting as favorite
      setDislikedGenres((d) => d.filter((g) => g !== genre))
      return [...prev, genre]
    })
  }

  const toggleDislikedGenre = (genre) => {
    setDislikedGenres((prev) => {
      const exists = prev.includes(genre)
      if (exists) return prev.filter((g) => g !== genre)
      // Remove from favorites if selecting as disliked
      setFavoriteGenres((f) => f.filter((g) => g !== genre))
      return [...prev, genre]
    })
  }

  const handleSubmit = async () => {
    if (favoriteMovies.length === 0) {
      setErrorMessage('Please select at least one movie that you like.')
      setStep(1)
      return
    }

    setSubmitting(true)
    setErrorMessage('')

    try {
      const surveyPayload = {
        favorite_movies: favoriteMovies,
        favorite_genres: favoriteGenres,
        disliked_genres: dislikedGenres,
        disliked_movies: [],
        watched_movies: favoriteMovies, // Add favorite movies as watched
        discovery_preference: discoveryPreference,
      }

      await api.submitSurvey(surveyPayload)
      await refreshProfile()
      setHasSurvey(true)
      navigate('/recommender')
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit taste profile. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className='flex min-h-0 w-full flex-1 flex-col items-center justify-center p-4 sm:p-6 text-zinc-100 overflow-y-auto'>
      <div className='w-full max-w-4xl rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-10 shadow-2xl shadow-black/80'>
        {/* Step Header */}
        <div className='flex items-center justify-between border-b border-zinc-900 pb-6 mb-8'>
          <div>
            <p className='text-xs uppercase tracking-[0.25em] text-zinc-500 font-mono'>
              Step 0{step} of 03
            </p>
            <h1 className='font-[asul] text-3xl sm:text-4xl mt-1 text-white'>
              {step === 1 && 'Favorite Cinema'}
              {step === 2 && 'Genre Landscape'}
              {step === 3 && 'Taste & Discovery Tuning'}
            </h1>
          </div>
          <div className='flex gap-2'>
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                type='button'
                onClick={() => setStep(s)}
                className={`h-2.5 rounded-full transition-all cursor-pointer ${
                  step === s ? 'w-8 bg-zinc-100' : 'w-2.5 bg-zinc-800 hover:bg-zinc-700'
                }`}
                aria-label={`Go to step ${s}`}
              />
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className='mb-6 rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-xs text-red-300'>
            {errorMessage}
          </div>
        )}

        {/* STEP 1: FAVORITE MOVIES */}
        {step === 1 && (
          <div className='space-y-6'>
            <div>
              <label htmlFor='movie-search' className='block text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2'>
                Search & select movies you love (Pick at least 1)
              </label>
              <div className='relative'>
                <IoIosSearch className='absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-lg' />
                <input
                  id='movie-search'
                  type='text'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Search by title (e.g. Inception, The Matrix, Toy Story)...'
                  className='w-full rounded-2xl border border-zinc-800 bg-black py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-zinc-500'
                />
                {isSearching && (
                  <span className='absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500'>
                    Searching...
                  </span>
                )}

                {/* Dropdown search results */}
                {searchResults.length > 0 && (
                  <div className='absolute z-20 left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl'>
                    {searchResults.map((m) => {
                      const selected = favoriteMovies.includes(m.title)
                      return (
                        <button
                          key={m.movieId}
                          type='button'
                          onClick={() => {
                            toggleFavoriteMovie(m.title)
                            setSearchQuery('')
                            setSearchResults([])
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm transition cursor-pointer ${
                            selected
                              ? 'bg-zinc-800 text-white'
                              : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                          }`}
                        >
                          <div>
                            <span className='font-medium'>{m.title}</span>
                            <span className='ml-2 text-xs text-zinc-500'>{m.genres}</span>
                          </div>
                          {selected ? (
                            <IoMdCheckmark className='text-zinc-100 text-base' />
                          ) : (
                            <span className='text-xs text-zinc-400'>+ Add</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Selected movies tags */}
            {favoriteMovies.length > 0 && (
              <div>
                <p className='text-xs uppercase tracking-[0.2em] text-zinc-400 mb-3'>
                  Selected Favorites ({favoriteMovies.length}):
                </p>
                <div className='flex flex-wrap gap-2'>
                  {favoriteMovies.map((title) => (
                    <span
                      key={title}
                      className='inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3.5 py-1.5 text-xs text-zinc-200'
                    >
                      <span>{title}</span>
                      <button
                        type='button'
                        onClick={() => toggleFavoriteMovie(title)}
                        className='cursor-pointer text-zinc-400 hover:text-white'
                        aria-label={`Remove ${title}`}
                      >
                        <IoMdClose />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick-pick popular chips */}
            <div>
              <p className='text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3'>
                Or choose from popular touchstones:
              </p>
              <div className='flex flex-wrap gap-2'>
                {CURATED_POPULAR.map((title) => {
                  const selected = favoriteMovies.includes(title)
                  return (
                    <button
                      key={title}
                      type='button'
                      onClick={() => toggleFavoriteMovie(title)}
                      className={`cursor-pointer rounded-full px-4 py-2 text-xs transition-colors border ${
                        selected
                          ? 'border-white bg-white text-black font-semibold'
                          : 'border-zinc-800 bg-black text-zinc-300 hover:border-zinc-600 hover:text-white'
                      }`}
                    >
                      {selected ? `✓ ${title}` : `+ ${title}`}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: GENRE PREFERENCES */}
        {step === 2 && (
          <div className='space-y-8'>
            <div>
              <p className='text-xs uppercase tracking-[0.2em] text-zinc-400 mb-3'>
                Select genres you gravitate towards:
              </p>
              <div className='flex flex-wrap gap-2.5'>
                {ALL_GENRES.map((genre) => {
                  const selected = favoriteGenres.includes(genre)
                  return (
                    <button
                      key={genre}
                      type='button'
                      onClick={() => toggleFavoriteGenre(genre)}
                      className={`cursor-pointer rounded-full px-4 py-2 text-xs transition-colors border ${
                        selected
                          ? 'border-white bg-white text-black font-semibold'
                          : 'border-zinc-800 bg-black text-zinc-300 hover:border-zinc-600 hover:text-white'
                      }`}
                    >
                      {selected && <span className='mr-1'>✓</span>}
                      {genre}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className='border-t border-zinc-900 pt-6'>
              <p className='text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3'>
                Genres you'd rather avoid (Optional):
              </p>
              <div className='flex flex-wrap gap-2.5'>
                {ALL_GENRES.map((genre) => {
                  const isDisliked = dislikedGenres.includes(genre)
                  return (
                    <button
                      key={genre}
                      type='button'
                      onClick={() => toggleDislikedGenre(genre)}
                      className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs transition-colors border ${
                        isDisliked
                          ? 'border-red-900 bg-red-950/80 text-red-200'
                          : 'border-zinc-900 bg-black/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                      }`}
                    >
                      {isDisliked ? `✕ Avoid ${genre}` : genre}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: DISCOVERY TUNING */}
        {step === 3 && (
          <div className='space-y-6'>
            <p className='text-xs uppercase tracking-[0.2em] text-zinc-400'>
              How would you like CineMatch to balance recommendations?
            </p>

            <div className='grid gap-4 sm:grid-cols-3'>
              {[
                {
                  id: 'familiar',
                  title: 'Familiar Comfort',
                  desc: 'Focus on renowned, closely aligned movies and acclaimed classics.',
                },
                {
                  id: 'balanced',
                  title: 'Balanced Palette',
                  desc: 'A versatile blend of close similarities and refreshing new directions.',
                },
                {
                  id: 'adventurous',
                  title: 'Adventurous Discovery',
                  desc: 'Surprise me with daring picks, hidden gems, and varied narratives.',
                },
              ].map((opt) => {
                const selected = discoveryPreference === opt.id
                return (
                  <button
                    key={opt.id}
                    type='button'
                    onClick={() => setDiscoveryPreference(opt.id)}
                    className={`flex flex-col justify-between rounded-2xl p-5 text-left border cursor-pointer transition-colors ${
                      selected
                        ? 'border-white bg-zinc-900 text-white shadow-lg shadow-black/40'
                        : 'border-zinc-800 bg-black text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div>
                      <div className='flex items-center justify-between'>
                        <span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-zinc-200'}`}>
                          {opt.title}
                        </span>
                        {selected && <IoMdCheckmark className='text-white text-lg' />}
                      </div>
                      <p className='mt-2.5 text-xs leading-5 text-zinc-400'>
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Profile summary */}
            <div className='rounded-2xl border border-zinc-800/80 bg-black/60 p-5'>
              <h3 className='text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3'>Your Taste Summary</h3>
              <div className='space-y-2 text-xs text-zinc-300'>
                <p>
                  <span className='text-zinc-500'>Favorite Movies: </span>
                  {favoriteMovies.length > 0 ? favoriteMovies.join(', ') : 'None selected'}
                </p>
                <p>
                  <span className='text-zinc-500'>Favorite Genres: </span>
                  {favoriteGenres.length > 0 ? favoriteGenres.join(', ') : 'Open to all'}
                </p>
                {dislikedGenres.length > 0 && (
                  <p>
                    <span className='text-zinc-500'>Filtered Genres: </span>
                    {dislikedGenres.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className='mt-10 flex items-center justify-between border-t border-zinc-900 pt-6'>
          {step > 1 ? (
            <button
              type='button'
              onClick={() => setStep((s) => s - 1)}
              className='cursor-pointer text-xs uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition'
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type='button'
              onClick={() => {
                if (step === 1 && favoriteMovies.length === 0) {
                  setErrorMessage('Please select at least 1 favorite movie to continue.')
                  return
                }
                setErrorMessage('')
                setStep((s) => s + 1)
              }}
              className='cursor-pointer rounded-full bg-zinc-100 px-7 py-3 text-xs font-semibold uppercase tracking-wider text-black hover:bg-white transition'
            >
              Next Step →
            </button>
          ) : (
            <button
              type='button'
              disabled={submitting}
              onClick={handleSubmit}
              className='cursor-pointer rounded-full bg-zinc-100 px-8 py-3 text-xs font-semibold uppercase tracking-wider text-black hover:bg-white transition disabled:opacity-50'
            >
              {submitting ? 'Generating 7 Recommendations...' : 'Complete & Discover Movies'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Survey