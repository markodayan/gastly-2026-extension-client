import { Header } from './components/Header';
import { Body } from './components/Body';
import { useExtensionState } from './hooks/useExtensionState';
import { useEffect, useRef } from 'react';
import manifest from '../../public/manifest.json';

function App() {
  const { state, setPreference } = useExtensionState();
  const renderCount = useRef(0);

  renderCount.current += 1;
  // console.log('App render', renderCount.current, new Date().toUTCString());

  // For profiling how many renders are happening and whether they are unnecessary
  useEffect(() => {
    // console.log('[App state changed]', new Date().toUTCString(), state);
  }, [state]);

  // No state found (if loading state, probably could do some animation here)
  if (!state) {
    return (
      <main>
        <div className='w-140 h-87.5 bg-card flex flex-col justify-center items-center gap-y-5'>
          <p className='font-quicksand text-[25px] text-white/55'>
            Loading <span className='text-white/20'>(not really if you reading this)</span>
          </p>
          <p className='font-quicksand text-[15px] text-active mx-17.5 text-center'>
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
      <div className='w-140'>
        {/* Header is capable of mutating state */}
        <Header preferences={state.preferences} spots={state.spots} setPreference={setPreference} />
        {/* Body is a read-only component  */}
        <Body block={state.block!} spots={state.spots!} preferences={state.preferences} />

        <div className='bg-card/94'>
          <p className='text-white/50 text-center py-2'>
            App Version: <span className='text-white font-medium'>{manifest.version}</span>
          </p>
        </div>
      </div>
    </main>
  );
}

export default App;
