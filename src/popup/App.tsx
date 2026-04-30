import { Header } from './components/Header';
import { Body } from './components/Body';
import { useExtensionState } from './hooks/useExtensionState';
import { useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import manifest from '../../public/manifest.json';
import type { Preferences } from '../shared/types';

function App() {
  // const [scale, setScale] = useState<AppScale>(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { state, setPreference } = useExtensionState();

  const BASE_WIDTH = 560; // w-140
  const BASE_HEIGHT = 412; // measured manually
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

  const s = Number(state.preferences.appScalePreference);
  console.log(state);

  console.log('s', s);

  return (
    <div
      style={{
        width: BASE_WIDTH * s,
        height: BASE_HEIGHT * s,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          transform: `scale(${s})`,
          transformOrigin: 'top left',
        }}
        className='bg-card overflow-hidden'
      >
        <div className='w-full'>
          {/* Header is capable of mutating state */}
          <Header
            preferences={state.preferences}
            spots={state.spots}
            setPreference={setPreference}
          />
          {/* Body is a read-only component  */}
          <Body block={state.block!} spots={state.spots!} preferences={state.preferences} />

          {/* Footer  */}
          <div className='relative flex bg-darker-shade/30 items-center justify-center border-none'>
            <div className='absolute left-2 top-1/2 -translate-y-1/2'>
              <div className='relative group'>
                <button
                  type='button'
                  aria-label='Open settings'
                  className=' outline-none flex bg-darker-shade pt-[4px] pb-[3px] px-5 rounded-[10px] cursor-pointer group-hover:bg-primary/60  transition-all duration-300'
                  onClick={() => setSettingsOpen((open) => !open)}
                >
                  <Settings
                    className='text-active group-hover:text-white/60 justify-center items-center transition-all duration-300'
                    strokeWidth={2}
                    size={17}
                  />
                </button>

                {settingsOpen && (
                  <div className='absolute left-0 bottom-full mb-2 z-50 px-6 py-2 hidden min-w-40 rounded-lg border border-sky-400/20 rounded-bl-none rounded-tl-none bg-card  shadow-md shadow-metric-label/20 group-focus-within:block '>
                    <div className='grid grid-cols-[auto_72px] items-center gap-x-2'>
                      <label
                        htmlFor='app-size'
                        className='whitespace-nowrap text-[14px] font-semibold text-settings-label'
                      >
                        App size:
                      </label>
                      <select
                        className='h-7 rounded-md  border border-active/20 bg-darker-shade px-2 text-xs font-semibold text-settings-value outline-none focus:border-ethbtc'
                        id='app-size'
                        value={s}
                        onChange={(e) => {
                          void setPreference(
                            'appScalePreference',
                            Number(e.target.value) as Preferences['appScalePreference'],
                          );
                          // setScale(Number(e.target.value) as AppScale);

                          setSettingsOpen(false);
                        }}
                      >
                        <option value={1}>100%</option>
                        <option value={0.9}>90%</option>
                        <option value={0.8}>80%</option>
                        <option value={0.7}>70%</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className='text-white/50 text-center py-2'>
              App Version: <span className='text-white font-medium'>{manifest.version}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
