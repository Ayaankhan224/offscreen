import React, { useState } from 'react'

const Library = () => {
  const [activeTab, setActiveTab] = useState('watched')

  return (
    <div className='h-full w-full'>
      <div className='w-full h-[6%] min-h-9 flex justify-center'>
        <div className='relative w-56 h-9 border border-white/70 rounded-full p-0.5 text-white flex items-center text-xs tracking-[0.12em]'>
          <span
            aria-hidden='true'
            className={`absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-white transition-transform duration-300 ${activeTab === 'watchlist' ? 'translate-x-full' : ''}`}
          />
          <button
            type='button'
            onClick={() => setActiveTab('watched')}
            aria-pressed={activeTab === 'watched'}
            className={`relative z-10 flex-1 h-full rounded-full transition-colors ${activeTab === 'watched' ? 'text-black' : 'text-white'}`}
          >
            WATCHED
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('watchlist')}
            aria-pressed={activeTab === 'watchlist'}
            className={`relative z-10 flex-1 h-full rounded-full transition-colors ${activeTab === 'watchlist' ? 'text-black' : 'text-white'}`}
          >
            WATCHLIST
          </button>
        </div>
      </div>
      <div className='h-full w-full flex justify-center mt-10 gap-20 flex-wrap overflow-y-auto scrollbar-thumb-gray-100'>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
        <div className='bg-emerald-400 w-[14%] h-[35%]'></div>
      </div>
    </div>
  )
}

export default Library
