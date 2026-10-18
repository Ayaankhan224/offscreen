import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import Navbar from './Navbar'
import Hero from './Hero'
import About from './pages/About'
import Library from './pages/Library'
import Recommender from './pages/Recommender'
import Signup from './pages/Signup'
import Survey from './pages/Survey'

const App = () => {
  return (
    <>
      <div className='desktop-only-notice' role='status'>
        <div className='desktop-only-notice__content'>
          <span className='desktop-only-notice__eyebrow'>OFFSCREEN</span>
          <h1>Made for the big screen.</h1>
          <p>This website is designed for PCs and laptops. Please open OffScreen on a desktop device.</p>
        </div>
      </div>
      <div className='desktop-app flex h-screen w-screen flex-col overflow-hidden bg-black text-zinc-100'>
        <Navbar />
        <main className='flex min-h-0 flex-1 w-full overflow-hidden'>
          <Routes>
            <Route path='/' element={<Hero />} />
            <Route path='/about' element={<About />} />
            <Route path='/library' element={<Library />} />
            <Route path='/signup' element={<Signup />} />
            <Route path='/survey' element={<Survey />} />
            <Route path='/recommender' element={<Recommender />} />
            <Route path='/Recommender' element={<Recommender />} />
            <Route path='*' element={<Navigate to='/' replace />} />
          </Routes>
        </main>
      </div>
    </>
  )
}

export default App
