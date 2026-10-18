import React from 'react'
import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    <div className='text-zinc-200 w-full h-[14%] shrink-0 flex font-[asul] p-3'>
      <Link to='/recommender' className='h-full w-[13%] flex items-center'>
        <img src="/assets/logo.png" alt="Fable logo" className='h-[6rem] w-auto object-contain' />
      </Link>
      <Link to='/recommender' className='h-full w-[37%] flex items-center text-[6rem]'>SCREEN</Link>
      <div className='h-full w-[50%] flex justify-end gap-9 '>
        <Link to='/about' className='w-fit h-7 flex justify-center items-center underline-slide'>ABOUT</Link>
        <Link to='/source' className='w-fit h-7 flex justify-center items-center underline-slide'>SOURCE</Link>
        <Link to='/library' className='w-fit h-7 flex justify-center items-center underline-slide'>LIBRARY</Link>
        <Link to='/signup' className='w-24 h-7 flex justify-center cursor-pointer items-center bg-zinc-200 border-2 border-zinc-200 text-black rounded-4xl hover:bg-black hover:text-zinc-200'>SIGN-UP</Link>
      </div>
    </div>
  )
}

export default Navbar
