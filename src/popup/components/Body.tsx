import type { NormalisedBlock, NormalisedSpotPrices, Preferences } from '../../shared/types';
import { TX_OPTIONS } from '../../shared/config';
import CountUp from 'react-countup';

/* 
 Body should receive these props from Ap:
  - block
  - spots
  - preferences

  It should use props to derive:
    - block metrics
    - active card (not necessary)
    - gas price per speed
    - fiat fee per speed 
*/

const SYMBOL_MAP = {
  ethusd: '$',
  ethzar: 'R',
  ethaud: '$',
  etheur: '€', // add once legacy is deprecated
};

// const TX_OPTIONS: Array<{
//   label: string;
//   id: Preferences['transactionPreference'];
//   gasUnits: number;
// }> = [
//   {
//     label: 'Send ETH',
//     id: 'eth-send',
//     gasUnits: 21000,
//   },
// ];

const CARD_META: Array<{
  label: 'Fast' | 'Average' | 'Slow';
  speed: Preferences['gasPreference'];
  eta: string;
}> = [
  { label: 'Fast', speed: 'fast', eta: '1 block' },
  { label: 'Average', speed: 'average', eta: '3 blocks' },
  { label: 'Slow', speed: 'slow', eta: '5+ blocks' },
];

type BodyProps = {
  block: NormalisedBlock;
  spots: NormalisedSpotPrices;
  preferences: Preferences;
};

export function Body({ block, spots, preferences }: BodyProps) {
  return (
    <div className='bg-card'>
      <BlockSection block={block} spots={spots} />
      <CardsSection block={block} spots={spots} preferences={preferences} />
    </div>
  );
}

type BlockSectionProps = {
  block?: NormalisedBlock;
  spots?: NormalisedSpotPrices;
};

function BlockSection({ block, spots }: BlockSectionProps) {
  const capacity = block ? Math.round((block.gasUsed / block.gasLimit) * 100) : undefined;
  const blockSize = block ? Math.round(block.size / 1000) : undefined; // convert to kB

  return (
    <>
      <div className='flex items-center justify-between border-r-0 py-2.5 px-3.75 pb-1.25'>
        <Metric label='Block Number'>
          {/* Count Up Will be put here for animation logic [TODO]*/}
          <CountUp end={block?.number as number} separator=' ' duration={0.3} />
        </Metric>
        <Metric label='ETH/BTC' customClass='w-[40%]' customValueStyle='text-white bg-ethbtc!'>
          <CountUp end={spots?.ethbtc as number} separator='' decimals={4} duration={0.3} />
        </Metric>
        <Metric label='TX Count'>
          <CountUp end={block?.txCount as number} separator='' decimals={0} duration={0.3} />
        </Metric>
      </div>
      <div className='flex items-center justify-between border-r-0 py-2.5 px-3.75 pb-1.25'>
        <Metric label='Base Fee' value={block?.basefee}>
          <CountUp
            end={block?.basefee as number}
            decimals={block!.basefee < 10 ? 2 : 0}
            suffix=' Gwei'
            duration={0.3}
          />
        </Metric>
        <Metric label='Gas Used'>
          <CountUp end={block!.gasUsed} decimals={0} duration={0.3} separator=',' />
        </Metric>
        <Metric label='Capacity'>
          <CountUp end={capacity!} decimals={0} suffix='%' />
        </Metric>

        <Metric label='Block Size'>
          <CountUp end={blockSize!} decimals={0} suffix=' kB' />
        </Metric>
        {/* <Metric label='Base Fee' value={block?.basefee} suffix=' Gwei' />
        <Metric label='Gas Used' value={block?.gasUsed} suffix='' />
        <Metric label='Capacity' value={capacity} suffix='%' />
        <Metric label='Block Size' value={blockSize} suffix=' kB' /> */}
      </div>
    </>
  );
}

type MetricProps = {
  label: string;
  value?: number;
  suffix?: string;
  customClass?: string;
  customLabelStyle?: string;
  customValueStyle?: string;
  children: React.ReactNode;
};

//  Might just have to add CountUp and suffix as child and make Metric a wrapped parent
function Metric({ label, suffix, customClass, customValueStyle, children }: MetricProps) {
  return (
    <div className={`flex flex-col justify-between ${customClass ?? ''}`}>
      <p className='text-metric-label text-shadow-[0_0_1px_#737373] text-center tracking-[0.7px] text-[13px]  my-1.25 mx-2.5'>
        {label}
      </p>
      <span
        className={`text-center text-reading-color tracking-[1.8px] font-light text-[12px] rounded-[7px] bg-text-bg py-1.25 px-2.25 ml-1.25 ${
          customValueStyle ?? ''
        }`}
      >
        {children}
        {suffix ?? ''}
      </span>
    </div>
  );
}

type CardSectionProp = {
  block: NormalisedBlock;
  spots: NormalisedSpotPrices;
  preferences: Preferences;
};

function CardsSection({ block, spots, preferences }: CardSectionProp) {
  const selectedSpot = spots?.[preferences.fiatPreference];
  const gasUnits = TX_OPTIONS[preferences.transactionPreference].gasUnits;
  const fiatSymbol = SYMBOL_MAP[preferences.fiatPreference];

  const cards = CARD_META.map((card, i) => {
    const baseFee = block?.basefee;
    const priorityFee = block?.priorityFees[card.speed];

    const gasPrice = clean(baseFee + priorityFee);

    const [isBelowThreshold, fiatFee] = gasPriceToFiat(gasPrice, gasUnits, selectedSpot);

    return (
      <PriceCard
        key={card.speed}
        label={card.label}
        active={preferences.gasPreference === card.speed}
        eta={card.eta}
        gasPrice={gasPrice}
        baseFee={baseFee}
        priorityFee={priorityFee}
        fiatFee={fiatFee}
        fiatFeeBelowThreshold={isBelowThreshold}
        fiatSymbol={fiatSymbol}
        extraClasses={i === 1 ? 'mx-[10px]' : undefined}
      />
    );
  });

  return <div className='flex justify-evenly border-r-0 py-2.5 px-3.75'>{cards}</div>;
}

type PriceCardProps = {
  active: boolean;
  label: string;
  eta?: string;
  gasPrice?: number;
  baseFee?: number;
  priorityFee?: number;
  fiatFee?: number;
  fiatFeeBelowThreshold: boolean;
  fiatSymbol?: string;
  extraClasses?: string;
};

function PriceCard({
  active,
  label,
  gasPrice,
  baseFee,
  priorityFee,
  fiatSymbol,
  fiatFee,
  fiatFeeBelowThreshold,
  extraClasses,
}: PriceCardProps) {
  const id = label.toLowerCase(); // just in case need it later
  const belowThresholdSuffix = fiatFeeBelowThreshold ? '<' : '';

  return (
    <div
      id={id}
      className={`flex flex-col w-[33%] h-43.75 bg-darker-shade rounded-[15px] border-4 border-solid border-card-border cursor-pointer ${active ? 'border-active' : 'border-inactive'} ${extraClasses ?? ''}`}
    >
      {/* Head  */}
      <div className='flex flex-col items-center'>
        <h3
          className={`font-normal text-[23px] tracking-[1.5px] pt-1 text-center ${active ? 'text-active' : 'text-white'}`}
        >
          {label}
        </h3>
      </div>
      {/* Gas Price  */}
      <div className='flex flex-col justify-center items-center'>
        <h2
          className={`text-center text-[35px] font-medium rounded-md  tracking-[2px]   pb-0 ${active ? 'text-reading-color' : 'text-[#ffffffbf]'}`}
        >
          {gasPrice ?? '-'}
        </h2>
      </div>
      {/* Fee Information  */}
      <div className='flex flex-col  mb-2'>
        {/* Base Fee  */}
        <div className='flex justify-between  pt-1.25 pb-0 mx-5'>
          <p className='text-white text-[10px] font-light tracking-[0.6px] font-quicksand'>
            Base Fee:
          </p>
          <span className='text-[10px] text-center font-medium tracking-[0.6px] text-reading-color font-quicksand'>
            {baseFee ?? '-'} Gwei
          </span>
        </div>
        {/* Priority Fee  */}
        <div className='flex justify-between mx-5'>
          <p className='text-white text-[10px] font-light tracking-[0.6px] font-quicksand'>
            Priority Fee:
          </p>
          <span className='text-[10px] text-center font-medium tracking-[0.6px] text-reading-color font-quicksand'>
            {priorityFee ?? '-'} Gwei
          </span>
        </div>
      </div>
      {/* Price Time Wrapper */}
      <div className='w-[75%] border-t-[0.5px] border-solid border-footer-card-border pt-1.25 mx-auto flex justify-evenly items-center'>
        {/* <p className='font-quicksand font-light text-[11px] tracking-[0.6px] text-white'>{eta}</p>
        <p className='font-sans font-light text-[11px] text-left text-footer-card-border'> | </p> */}
        <p className='font-sans font-light text-[11px] text-left text-reading-color tracking-[1.8px]'>
          {/* {`${belowThresholdSuffix}${fiatSymbol}${fiatFee}`} */}
          {`${belowThresholdSuffix}${fiatSymbol}`}
          <CountUp end={fiatFee!} decimals={2} duration={0.3} />
        </p>
      </div>
    </div>
  );
}

function gasPriceToFiat(gasPrice: number, gasUnits: number, spotRate: number): [boolean, number] {
  const costInEth = (gasPrice * gasUnits) / 1_000_000_000;
  const unfilteredFiatCost = costInEth * spotRate;
  const filteredFiatCost = Math.round(costInEth * spotRate * 100) / 100;
  const belowCentThreshold = unfilteredFiatCost < 0.01 ? true : false;
  return [belowCentThreshold, filteredFiatCost];
}

function clean(n: number): number {
  return n < 10 ? Number(n.toFixed(2)) : n;
}
