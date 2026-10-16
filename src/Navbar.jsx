import React from 'react'

const Navbar = () => {
  return (
    <div className='text-zinc-200 w-full h-[10%] flex font-[asul] p-3'>
      <div className='h-full w-[30%]'></div>
      <h1 className='h-full w-[45%] flex items-center text-[5.5rem]'>FABLE</h1>
      <div className='h-full w-[35%] flex justify-end gap-9 '>
        <div className='w-fit h-7 flex justify-center items-center underline-slide'>ABOUT</div>
        <div className='w-fit h-7 flex justify-center items-center underline-slide'>SOURCE</div>
        <div className='w-fit h-7 flex justify-center items-center underline-slide'>LIBRARY</div>
        <div className='w-24 h-7 flex justify-center cursor-pointer items-center bg-zinc-200 border-2 border-zinc-200 text-black rounded-4xl hover:bg-black hover:text-zinc-200'>SING-UP</div>
      </div>
    </div>
  )
}

export default Navbar
