import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Navbar from './Navbar'
import Hero from './Hero'
import About from './pages/About'
import Library from './pages/Library'
import Recommender from './pages/Recommender'
import Signup from './pages/Signup'
import Survey from './pages/Survey'

const App = () => {
  return (
    <div className='flex h-screen w-screen flex-col overflow-hidden'>
      <Navbar />
      <Routes>
        <Route path='/' element={<Hero />} />
        <Route path='/about' element={<About />} />
        <Route path='/library' element={<Library />} />
        <Route path='/signup' element={<Signup />} />
        <Route path='/survey' element={<Survey />} />
      </Routes>
    </div>
  )
}

export default App
