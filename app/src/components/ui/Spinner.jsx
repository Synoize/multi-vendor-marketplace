export default function Spinner({ size = 'md', color = 'blue' }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-2', lg: 'h-12 w-12 border-3', xl: 'h-16 w-16 border-4' }
  const colors = { blue: 'border-[#2874F0]', orange: 'border-[#FB641B]', white: 'border-white' }
  return (
    <div className="flex items-center justify-center p-4">
      <div className={`${sizes[size]} ${colors[color]} border-t-transparent rounded-full animate-spin`} />
    </div>
  )
}
