export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full animate-fade-in">
      {children}
    </div>
  )
}
