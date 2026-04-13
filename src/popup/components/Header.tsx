import { useEffect, useRef } from 'react';
import type { NormalisedSpotPrices, Preferences } from '../../shared/types';
import { TX_OPTIONS } from '../../shared/config';
import CountUp from 'react-countup';

const SPOT_TICKER_MAP: Record<Preferences['fiatPreference'], string> = {
  ethusd: 'ETH/USD',
  etheur: 'ETH/EUR',
  ethaud: 'ETH/AUD',
  ethzar: 'ETH/ZAR',
};

const FIAT_OPTIONS: Array<{ label: string; value: Preferences['fiatPreference'] }> = [
  { label: 'USD', value: 'ethusd' },
  // { label: 'EUR', value: 'etheur' },  Only after API migration
  { label: 'AUD', value: 'ethaud' },
  { label: 'ZAR', value: 'ethzar' },
];

// const GAS_OPTIONS: Array<{ label: string; value: Preferences['gasPreference'] }> = [
//   { label: 'Fast', value: 'fast' },
//   { label: 'Average', value: 'average' },
//   { label: 'Slow', value: 'slow' },
// ];

const txMenuOptions = Object.values(TX_OPTIONS).map((opt) => {
  return {
    label: opt.label, // e.g. label: 'Swap (CowSwap)
    id: opt.id, // e.g. id: 'swap-cowswap'
  };
});

// const TX_OPTIONS: Array<{ label: string; value: Preferences['transactionPreference'] }> = [
//   { label: 'Send ETH', value: 'eth-send' },
//   { label: 'Swap (CowSwap)', value: 'swap-cowswap' },

// ];

type HeaderProps = {
  preferences: Preferences;
  spots?: NormalisedSpotPrices;
  setPreference: (key: string, value: string) => void | Promise<void>;
};

// Calling useExtensionState here will cause Header to re-render whenever any part of extension state changes, including block updates that have nothing to do with the spot label/value]

export function Header({ preferences, spots, setPreference }: HeaderProps) {
  const spotLabel = SPOT_TICKER_MAP[preferences.fiatPreference];
  const spotValue = spots?.[preferences.fiatPreference];
  // Development state
  const headerRenderCount = useRef(0);
  headerRenderCount.current += 1;
  console.log('Header render', headerRenderCount.current, new Date().toUTCString());

  useEffect(() => {
    console.log('Header render (props changed) ', new Date().toUTCString(), preferences);
  }, [preferences]);

  useEffect(() => {
    console.log(
      'Header props changed (spots - should only happen every 1 minute',
      new Date().toUTCString(),
      spots,
    );
  }, [spots]);

  return (
    <div className='flex justify-between items-center bg-primary px-4 py-1 pb-1.25'>
      <div className='space-x-2'>
        {/* Fiat currency preference menu  */}
        <Select
          value={preferences.fiatPreference}
          onChange={(e) =>
            void setPreference('fiatPreference', e.target.value as Preferences['fiatPreference'])
          }
        >
          {FIAT_OPTIONS.map((option) => (
            <SelectOption key={option.label} value={option.value}>
              {option.label}
            </SelectOption>
          ))}
        </Select>

        {/* Gas speed preference menu  */}
        {/* <Select
          value={preferences.gasPreference}
          onChange={(e) => {
            void setPreference('gasPreference', e.target.value as Preferences['gasPreference']);
          }}
        >
          {GAS_OPTIONS.map((option) => (
            <SelectOption key={option.label} value={option.value}>
              {option.label}
            </SelectOption>
          ))}
        </Select> */}

        {/* Transaction preference menu  */}
        <Select
          value={preferences.transactionPreference}
          onChange={(e) =>
            void setPreference(
              'transactionPreference',
              e.target.value as Preferences['transactionPreference'],
            )
          }
        >
          {txMenuOptions.map((option) => (
            <SelectOption key={option.id} value={option.id}>
              {option.label}
            </SelectOption>
          ))}
        </Select>
      </div>

      {/* Spot Rate  */}
      <SpotRate ticker={spotLabel} value={spotValue} />
    </div>
  );
}

type SelectProps = {
  children: React.ReactNode;
  value: string;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
};

function Select({ children, value, onChange }: SelectProps) {
  return (
    <select
      value={value}
      onChange={onChange}
      className='cursor-pointer bg-darker-shade text-white text-xs tracking-[1.5px] shadow-[0px_0px_0px_1px_rgba(0,0,0,0.1)] rounded-[13px] py-0.5 px-1.25 border-4 border-solid border-primary outline-none ] '
    >
      {children}
    </select>
  );
}

type SelectOptionProps = {
  children: React.ReactNode;
  value: string;
};

function SelectOption({ children, value }: SelectOptionProps) {
  return <option value={value}>{children}</option>;
}

type SpotRatesProp = {
  ticker: string;
  value?: number;
};

function SpotRate({ ticker, value }: SpotRatesProp) {
  return (
    <div className='flex flex-row justify-around mr-[1.25]'>
      <p className='text-[12px] text-white'>
        {ticker}:
        <span className='bg-darker-shade text-spot-color  text-[12px] tracking-[1.8px] font-light  rounded-[10px] py-1.25 px-2.25 ml-2.5  '>
          <CountUp decimals={2} end={value!} separator='' duration={0.6} />
        </span>
      </p>
    </div>
  );
}
