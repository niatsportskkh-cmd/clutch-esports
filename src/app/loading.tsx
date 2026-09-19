export default function Loading() {
  return (
    <div aria-busy className="flex animate-pulse flex-col gap-6 pt-6">
      {/* page changes get a quick red sweep along the top edge; the full loader is only for a visit's first load */}
      <div aria-hidden className="route-bar fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"><span /></div>
      <div className="h-16 w-2/3 max-w-xl rounded-2xl bg-white/[0.06]" />
      <div className="h-5 w-1/2 max-w-md rounded-full bg-white/[0.05]" />
      <div className="mt-8 h-36 max-w-3xl rounded-[1.75rem] bg-white/[0.04]" />
      <div className="h-36 max-w-3xl rounded-[1.75rem] bg-white/[0.04]" />
    </div>
  )
}
