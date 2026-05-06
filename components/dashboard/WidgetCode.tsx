'use client'
import { useState } from 'react'
import { Copy, Check, Code2 } from 'lucide-react'

export function WidgetCode({ clinicId }: { clinicId: string }) {
  const [copied, setCopied] = useState(false)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://huellabot.com'

  const code = `<!-- Huella Bot Widget -->
<script
  src="${appUrl}/widget.js"
  data-clinic-id="${clinicId}"
  defer
></script>`

  async function copyCode() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
          <Code2 size={20} className="text-brand-700" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Tu widget embebible</h2>
          <p className="text-sm text-gray-500">Pega este código antes del cierre de tu etiqueta &lt;/body&gt;</p>
        </div>
      </div>

      <div className="relative">
        <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-sm overflow-x-auto leading-relaxed font-mono">
          {code}
        </pre>
        <button
          onClick={copyCode}
          className="absolute top-3 right-3 flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'WordPress', tip: 'Usa el bloque "HTML personalizado"' },
          { label: 'Wix', tip: 'Agrega un elemento HTML desde el editor' },
          { label: 'Cualquier HTML', tip: 'Pega antes de </body>' },
        ].map(p => (
          <div key={p.label} className="bg-brand-50 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-brand-700 mb-0.5">{p.label}</p>
            <p className="text-xs text-brand-600">{p.tip}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
