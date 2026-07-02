interface HintTipProps {
  text: string;
}

export function HintTip({ text }: HintTipProps) {
  return (
    <div
      className="mt-1.5 rounded-xl border border-[#E8C547]/60 bg-[#FFF9E6] px-3 py-2.5 shadow-sm"
      role="note"
    >
      <p className="text-[13px] leading-relaxed text-[#5C4A1F]">
        <span aria-hidden className="mr-0.5">
          💡
        </span>
        {text}
      </p>
    </div>
  );
}
