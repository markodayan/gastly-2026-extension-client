import { Header } from './components/Header';
import { Body } from './components/Body';
import { useExtensionState } from './hooks/useExtensionState';
import { useEffect, useRef } from 'react';

function App() {
  const { state, setPreference } = useExtensionState();
  const renderCount = useRef(0);

  renderCount.current += 1;
  console.log('App render', renderCount.current, new Date().toUTCString());

  // For profiling how many renders are happening and whether they are unnecessary
  useEffect(() => {
    console.log('[App state changed]', new Date().toUTCString(), state);
  }, [state]);

  // No state found (if loading state, probably could do some animation here)
  if (!state) {
    return (
      <main>
        <div className='w-[560px] h-[350px] bg-card flex flex-col justify-center items-center gap-y-[20px]'>
          <p className='font-quicksand text-[25px] text-white/55'>
            Loading <span className='text-white/20'>(not really if you reading this)</span>
          </p>
          <p className='font-quicksand text-[15px] text-active mx-[70px] text-center'>
            Something relatively bad went wrong to get here... Contact{' '}
            <a
              className='cursor-pointer underline text-spot-color'
              href='http://x.com/markodayan'
              target='_blank'
            >
              @markodayan
            </a>{' '}
            on X 🥺
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className='w-[560px]'>
        <Header preferences={state.preferences} spots={state.spots} setPreference={setPreference} />
        <Body />
      </div>
    </main>
  );
}

export default App;
