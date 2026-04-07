export function Body() {
  return (
    <div className='bg-card'>
      <BlockSection />
      <CardsSection />
    </div>
  );
}

function BlockSection() {
  return (
    <div className='flex flex-wrap items-center justify-between border-r-0 py-[10px] px-[15px] pb-[5px]'>
      <Metric label='Block Number' value={23830321} decimals={0} />
      <Metric label='ETH/BTC' customClass='fill' value={0.0306} decimals={4} />
      <Metric label='TX Count' value={342} decimals={0} />
      <Metric label='Base Fee' value={0.1} decimals={2} suffix=' Gwei' />
      <Metric label='Gas Used' value={40653812} decimals={0} />
      <Metric label='Capacity' value={67} decimals={0} suffix='%' />
      <Metric label='Block Size' value={218} decimals={0} suffix=' kB' />
    </div>
  );
}

type MetricProps = {
  label: string;
  value: number;
  decimals: number;
  separator?: string;
  suffix?: string;
  customClass?: string;
};

function Metric(children: MetricProps) {
  return (
    <div
      className={`flex flex-col justify-between ${children.customClass === 'fill' ? 'w-3/6' : ''}`}
    >
      <p className='text-metric-label text-shadow-[0_0_1px_#737373] text-center tracking-[0.7px] text-[13px]  my-[5px] mx-[10px]'>
        {children.label}
      </p>
      <span className='text-center text-reading-color tracking-[1.8px] font-light text-[12px] rounded-[7px] bg-text-bg py-[5px] px-[9px] ml-[5px]'>
        {/* Count Up Will be put here for animation logic [TODO]*/}
        {children.value}
        {children.suffix && children.suffix}
      </span>
    </div>
  );
}

function CardsSection() {
  return (
    <div className='flex justify-evenly border-r-0 py-[10px] px-[15px]'>
      <PriceCard active={true} />
      <PriceCard active={false} extraClasses='mx-[10px]' />
      <PriceCard active={false} />
    </div>
  );
}

type PriceCardProps = {
  active: boolean;
  extraClasses?: string;
};

function PriceCard({ active, extraClasses }: PriceCardProps) {
  return (
    <div
      className={`flex flex-col w-[33%] h-[175px] bg-darker-shade rounded-[15px] border-4 border-solid border-card-border cursor-pointer ${active ? 'border-active' : 'border-inactive'} ${extraClasses && extraClasses}`}
    >
      {/* Head  */}
      <div className='flex flex-col items-center'>
        <h3
          className={`font-normal text-[23px] tracking-[1.5px] pt-[4px] text-center ${active ? 'text-active' : 'text-white'}`}
        >
          Fast
        </h3>
      </div>
      {/* Gas Price  */}
      <div className='flex flex-col justify-center items-center'>
        <h2
          className={`text-center text-[35px] font-medium rounded-[6px]  tracking-[2px]   pb-0 ${active ? 'text-reading-color' : 'text-[#ffffffbf]'}`}
        >
          1.3
        </h2>
      </div>
      {/* Fee Information  */}
      <div className='flex flex-col  mb-[8px]'>
        {/* Base Fee  */}
        <div className='flex justify-between  pt-[5px] pb-[0px] mx-[20px]'>
          <p className='text-white text-[10px] font-light tracking-[0.6px] font-quicksand'>
            Base Fee:
          </p>
          <span className='text-[10px] text-center font-medium tracking-[0.6px] text-reading-color font-quicksand'>
            0.1 Gwei
          </span>
        </div>
        {/* Priority Fee  */}
        <div className='flex justify-between mx-[20px]'>
          <p className='text-white text-[10px] font-light tracking-[0.6px] font-quicksand'>
            Priority Fee:
          </p>
          <span className='text-[10px] text-center font-medium tracking-[0.6px] text-reading-color font-quicksand'>
            1.2 Gwei
          </span>
        </div>
      </div>
      {/* Price Time Wrapper */}
      <div className='w-[75%] border-t-[0.5px] border-solid border-footer-card-border pt-[5px] mx-auto flex justify-evenly items-center'>
        <p className='font-quicksand font-light text-[11px] tracking-[0.6px] text-white'>~1 Min</p>
        <p className='font-sans font-light text-[11px] text-left text-footer-card-border'> | </p>
        <p className='font-sans font-light text-[11px] text-left text-reading-color tracking-[1.8px]'>
          $0.06
        </p>
      </div>
    </div>
  );
}
