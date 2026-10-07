export function AuthStacksPanel() {
  return (
    <aside className="hidden w-[42%] shrink-0 flex-col justify-between bg-stacks px-12 py-14 text-stacks-text lg:flex">
      <div>
        <p className="font-serif text-2xl">Card Catalog</p>
        <p className="mt-1 font-sans text-[11px] text-[#B7AD96]">MAIN BRANCH REFERENCE DESK</p>
      </div>
      <div className="border-y border-[#6B5539] py-4 font-sans text-[11px] leading-8 text-[#B7AD96]">
        <p>005.1 &nbsp; Computer Science</p>
        <p>398.2 &nbsp; Folklore &amp; Myth</p>
        <p>641.5 &nbsp; Culinary Arts</p>
        <p>910 &nbsp;&nbsp;&nbsp; Travel &amp; Geography</p>
      </div>
      <p className="max-w-[30ch] font-serif text-[18px] leading-relaxed text-[#EDE6D3]">
        A record of what the community has kept, borrowed, and passed along.
      </p>
    </aside>
  );
}
