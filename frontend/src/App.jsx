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
    <div className='flex h-screen w-screen flex-col overflow-hidden bg-black text-zinc-100'>
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
  )
}

export default App
