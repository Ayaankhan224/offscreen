import React, { useState } from 'react'
import { IoIosRefresh } from "react-icons/io";

const movies = [
  { title: 'MOVIE 1', summary: 'ABOUT MOVIE 1', color: '#8b5cf6' },
  { title: 'MOVIE 2', summary: 'ABOUT MOVIE 2', color: '#0ea5e9' },
  { title: 'MOVIE 3', summary: 'ABOUT MOVIE 3', color: '#f43f5e' },
  { title: 'MOVIE 4', summary: 'ABOUT MOVIE 4', color: '#ffffff' },
  { title: 'MOVIE 5', summary: 'ABOUT MOVIE 5', color: '#f59e0b' },
  { title: 'MOVIE 6', summary: 'ABOUT MOVIE 6', color: '#10b981' },
  { title: 'MOVIE 7', summary: 'ABOUT MOVIE 7', color: '#6366f1' },
]

const Recommender = () => {
  const [selectedMovie, setSelectedMovie] = useState(3)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const movie = movies[selectedMovie]

  const handleMovieScroll = (event) => {
    if (Math.abs(event.deltaY) < 2) return
    const direction = event.deltaY > 0 ? 1 : -1
    setSelectedMovie((current) => (current + direction + movies.length) % movies.length)
  }

  const handlePointerMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const horizontal = (event.clientX - bounds.left) / bounds.width - 0.5
    const vertical = (event.clientY - bounds.top) / bounds.height - 0.5
    setTilt({ x: -vertical * 28, y: horizontal * 28 })
  }

  return (
    <div onMouseMove={handlePointerMove} onMouseLeave={() => setTilt({ x: 0, y: 0 })} className='w-full h-full flex p-6 text-white'>
      <div className='h-full w-[25%]'>
        <div
          onWheel={handleMovieScroll}
          aria-label='Scroll to switch movies'
          className='flex h-[70%] max-h-56 min-h-0 w-full flex-col justify-center gap-3 overflow-y-auto py-4 pr-3'
        >
          {movies.map((item, index) => (
            <button
              key={item.title}
              type='button'
              onClick={() => setSelectedMovie(index)}
              aria-pressed={selectedMovie === index}
              className={`w-fit shrink-0 cursor-pointer text-left transition-colors ${selectedMovie === index ? 'text-2xl text-white' : 'text-zinc-500 hover:text-zinc-200'}`}
            >
              {item.title}
            </button>
          ))}
        </div>
        <div className='flex flex-col justify-center w-full h-[30%]'>
          <button
            type='button'
            aria-label='Refresh recommendations'
            className='w-20 h-20 flex justify-center cursor-pointer items-center bg-zinc-200 border-2 border-zinc-200 text-black rounded-full hover:bg-black hover:text-zinc-200 transition-colors'
          >
            <IoIosRefresh aria-hidden='true' className='w-12 h-12' />
          </button>
        </div>
      </div>
      <div className='flex flex-col justify-around items-center h-full w-[50%]'>
        <div
          style={{
            backgroundColor: movie.color,
            transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.04)`,
          }}
          className='h-[70%] w-[50%] rounded-xl shadow-2xl shadow-black/60 transition-[background-color,transform] duration-200 ease-out will-change-transform'
        />
        <div className='w-full max-w-2xl px-6 text-center'>
          <h1 className='font-[asul] text-5xl uppercase tracking-wide text-zinc-100 sm:text-6xl'>{movie.title}</h1>
          <h1 className='mx-auto mt-3 max-w-xl text-xs leading-6 text-zinc-400 sm:text-sm'>{movie.summary}</h1>
        </div>
      </div>
      <div className='flex h-full w-[25%] items-center justify-center px-4'>
        <section className='w-full max-w-xs rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 sm:p-6'>
          <p className='text-[0.65rem] uppercase tracking-[0.24em] text-zinc-500'>Your movie journal</p>
          <h1 className='mt-2 font-[asul] text-4xl font-bold text-zinc-100'>WATCHED?</h1>
          <label htmlFor='review' className='mt-6 block text-xs uppercase tracking-[0.16em] text-zinc-400'>Write a review</label>
          <textarea
            name='review'
            id='review'
            placeholder='What stayed with you?'
            className='mt-2 h-36 w-full resize-none rounded-xl border border-zinc-800 bg-black/40 p-3 text-left text-sm leading-6 text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-500'
          />
          <button
            type='button'
            className='mt-4 flex h-8 w-20 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-zinc-200 text-xs tracking-wide text-black transition-colors hover:bg-black hover:text-zinc-200'
          >
            SUBMIT
          </button>
        </section>
      </div>
    </div>
  )
}

export default Recommender
