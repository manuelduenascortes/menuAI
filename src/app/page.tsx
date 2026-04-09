import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 p-6 text-center">
      <div className="max-w-2xl">
        <div className="text-6xl mb-4">🍽️</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">MenuAI</h1>
        <p className="text-xl text-gray-600 mb-2">
          Carta digital inteligente para hostelería
        </p>
        <p className="text-gray-500 mb-8">
          Tus clientes escanean el QR, ven la carta y un chatbot IA les ayuda a elegir según sus gustos, alergias y preferencias.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/admin/login">
            <Button size="lg" className="w-full sm:w-auto">
              Acceder al panel de gestión
            </Button>
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            { icon: '📱', title: 'QR por mesa', desc: 'Cada mesa tiene su código QR único. El cliente escanea y ve tu carta al instante.' },
            { icon: '🤖', title: 'Chatbot IA', desc: 'El asistente pregunta por alergias y preferencias, y recomienda platos personalizados.' },
            { icon: '⚙️', title: 'Panel admin', desc: 'Gestiona categorías, platos, ingredientes, alergenos y mesas desde un solo lugar.' },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
