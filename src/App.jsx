import React from 'react'
import Navbar from './Navbar'
import Hero from './Hero'

const App = () => {
  return (
    <div className='flex h-screen w-screen flex-col overflow-hidden'>
      <Navbar />
      <Hero />
    </div>
  )
}

export default App
