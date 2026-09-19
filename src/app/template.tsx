// A template remounts on every navigation, so the page-in animation replays while the swarm morphs behind it.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>
}
