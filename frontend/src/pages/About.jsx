import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const About = () => {
  const { user, hasSurvey } = useAuth()
  const destination = !user ? '/signup' : hasSurvey ? '/recommender' : '/survey'

  return (
    <main className='min-h-0 w-full flex-1 overflow-y-auto px-6 py-10 text-zinc-200 sm:px-10'>
      <div className='mx-auto max-w-4xl'>
        <header className='border-b border-zinc-800 pb-8'>
          <p className='font-mono text-xs uppercase tracking-[0.2em] text-zinc-500'>OffScreen / About</p>
          <h1 className='mt-4 max-w-3xl font-[asul] text-4xl leading-tight text-white sm:text-6xl'>
            How the recommendations work
          </h1>
          <p className='mt-5 max-w-2xl text-sm leading-7 text-zinc-400'>
            OffScreen is a movie discovery app built with React, FastAPI, and MongoDB. It uses your survey answers and activity to rank films from a catalog of titles, genres, tags, and ratings.
          </p>
        </header>

        <section className='border-b border-zinc-800 py-8' aria-labelledby='flow-title'>
          <h2 id='flow-title' className='mb-6 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500'>01 / Request flow</h2>
          <div className='divide-y divide-zinc-900'>
            <article className='grid gap-2 py-5 sm:grid-cols-[10rem_1fr] sm:gap-8'>
              <p className='font-mono text-xs text-zinc-500'>01 — PROFILE</p>
              <div>
                <h3 className='text-base text-zinc-100'>You set the starting point</h3>
                <p className='mt-2 max-w-2xl text-sm leading-6 text-zinc-400'>
                  The survey records favorite and disliked films, genres, watched titles, and a discovery preference. The FastAPI service saves this profile to MongoDB under your account. The frontend sends your access token with protected API requests.
                </p>
              </div>
            </article>
            <article className='grid gap-2 py-5 sm:grid-cols-[10rem_1fr] sm:gap-8'>
              <p className='font-mono text-xs text-zinc-500'>02 — RANKING</p>
              <div>
                <h3 className='text-base text-zinc-100'>The catalog is scored</h3>
                <p className='mt-2 max-w-2xl text-sm leading-6 text-zinc-400'>
                  The backend builds TF‑IDF vectors from film genres and tags, then compares films with cosine similarity. It combines similarity to favorites (65%), Bayesian-adjusted ratings (15%), and genre overlap (20%), with penalties for disliked films and genres. A diversity step reduces near-duplicates in the final seven picks.
                </p>
              </div>
            </article>
            <article className='grid gap-2 py-5 sm:grid-cols-[10rem_1fr] sm:gap-8'>
              <p className='font-mono text-xs text-zinc-500'>03 — FEEDBACK</p>
              <div>
                <h3 className='text-base text-zinc-100'>Your library carries forward</h3>
                <p className='mt-2 max-w-2xl text-sm leading-6 text-zinc-400'>
                  Watchlist, watched status, and reviews are saved to your profile. Reviewed films rated 3 or higher count as positive examples; lower ratings count as negative examples. Watched films are excluded from recommendations. Refresh asks the backend for another set using the updated profile.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section className='grid gap-8 border-b border-zinc-800 py-7 sm:grid-cols-2'>
          <div>
            <h2 className='font-mono text-xs uppercase tracking-[0.2em] text-zinc-500'>02 / Stack</h2>
            <p className='mt-3 text-sm leading-6 text-zinc-400'>React and Tailwind CSS in the browser; a FastAPI backend serves the API; MongoDB stores accounts and personal profiles.</p>
          </div>
          <div>
            <h2 className='font-mono text-xs uppercase tracking-[0.2em] text-zinc-500'>03 / Model inputs</h2>
            <p className='mt-3 text-sm leading-6 text-zinc-400'>The catalog is prepared from MovieLens movie, rating, and tag data. TF‑IDF and the cosine-similarity matrix are built offline and loaded by the recommendation service.</p>
          </div>
        </section>

        <footer className='flex items-center justify-between py-6'>
          <Link to='/' className='text-xs text-zinc-500 transition hover:text-zinc-200'>← Home</Link>
          <Link
            to={destination}
            className='rounded-full border border-zinc-700 px-5 py-2 text-xs text-zinc-200 transition hover:border-zinc-300 hover:text-white'
          >
            {user ? (hasSurvey ? 'Open recommender' : 'Take the survey') : 'Get started'}
          </Link>
        </footer>
      </div>
    </main>
  )
}

export default About
