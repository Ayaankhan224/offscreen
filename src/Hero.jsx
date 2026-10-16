import React from 'react'
import './Hero.css'

const posters = [
  'littleWomen.png',
  'AOT.png',
  'tenet.png',
  'darkKnightRises.png',
  'arcane.png',
  'Rango.png',
  'theExorcist.png',
  'dogDayAfternoon.png',
  'Clayface.png',
  'chernobyl.png',
  'theUsualSuspects.png',
  'primetime.png',
  'taxiDriver.png',
  'bb.png',
  'avengers.png',
  'youCanSeeEverything.png',
  'hamnet.png',
  'arrival.png',
]

const posterTitles = [
  'LITTLE WOMEN',
  'ATTACK ON TITAN',
  'TENET',
  'DARK KNIGHT RISES',
  'ARCANE',
  'RANGO',
  'THE EXORCIST',
  'DOG DAY AFTERNOON',
  'CLAYFACE',
  'CHERNOBYL',
  'THE USUAL SUSPECTS',
  'PRIMETIME',
  'TAXI DRIVER',
  'BREAKING BAD',
  'AGE OF ULTRON',
  'YOU CAN SEE EVERYTHING',
  'HAMNET',
  'ARRIVAL',
]

const Hero = () => {
  return (
    <div className='flex min-h-0 w-full flex-1 flex-col items-center'>
      <div className='poster-grid mt-6 grid h-[52%] w-full grid-cols-6 grid-rows-3'>
        {posters.map((poster, index) => (
          <div key={poster} className='poster-card flex items-center justify-center'>
            <div className='poster-art'>
              <img
                src={`/assets/homePosters/${poster}`}
                alt={posterTitles[index]}
                className='poster-image max-h-[50%] max-w-[60%] object-contain'
              />
            </div>
            <span className='poster-title'>{posterTitles[index]}</span>
          </div>
        ))}
      </div>
      <div className='mt-auto mb-8 flex flex-col items-center gap-5'>
        <p className='uppercase mx-auto max-w-6xl px-8 text-center font-[asul] text-[3rem] leading-[0.95] text-zinc-100'>
          “We are put on this earth to learn to live<br />
          with our own kind, and film is one of the<br />
          ways we learn that.”
          <span className='text-[1rem]'>-ROBER AGER</span>
        </p>
        <button className='w-32 h-7 flex justify-center cursor-pointer items-center bg-zinc-200 border-2 border-zinc-200 text-black rounded-4xl hover:bg-black hover:text-zinc-200'>
          GET STARTED
        </button>
      </div>
    </div>
  )
}

export default Hero
