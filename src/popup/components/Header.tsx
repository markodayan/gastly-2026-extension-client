export function Header() {
  return (
    <div className='flex justify-between items-center bg-primary px-4 py-1'>
      <div className='space-x-2'>
        <Select>
          <SelectOption>USD</SelectOption>
          <SelectOption>EUR</SelectOption>
          <SelectOption>AUD</SelectOption>
          <SelectOption>ZAR</SelectOption>
        </Select>
        <Select>
          <SelectOption>Fast</SelectOption>
          <SelectOption>Average</SelectOption>
          <SelectOption>Slow</SelectOption>
        </Select>
        <Select>
          <SelectOption>Send ETH</SelectOption>
          {/* To add: CowSwap, Across bridging, Aave deposit and withdrawal */}
        </Select>
      </div>
      {/* Spot Rate  */}
      <SpotRate />
    </div>
  );
}

type SelectProps = {
  children: React.ReactNode;
};

function Select({ children }: SelectProps) {
  return (
    <select className='cursor-pointer bg-darker-shade text-white text-xs tracking-[1.5px] shadow-[0px_0px_0px_1px_rgba(0,0,0,0.1)] rounded-[13px] py-[2px] px-[5px] border-4 border-solid border-primary outline-none ] '>
      {children}
    </select>
  );
}

type SelectOptionProps = {
  children: React.ReactNode;
};

function SelectOption({ children }: SelectOptionProps) {
  return <option>{children}</option>;
}

function SpotRate() {
  return (
    <div className='flex flex-row justify-around mr-[1.25]'>
      <p className='text-[12px] text-white'>
        ETH/USD:
        <span className='bg-darker-shade text-spot-color  text-[12px] tracking-[1.8px] font-light  rounded-[10px] py-[5px] px-[9px] ml-[10px]  '>
          2114.00
        </span>
      </p>
    </div>
  );
}
