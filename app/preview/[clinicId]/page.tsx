import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function PreviewPage({ params }: { params: { clinicId: string } }) {
  const { data: clinic } = await supabase
    .from('clinics')
    .select('name')
    .eq('id', params.clinicId)
    .single()

  if (!clinic) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Vista previa — {clinic.name}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: system-ui, sans-serif; background: #f8fafc; min-height: 100vh; }
          .preview-banner {
            background: #2D6A4F; color: white;
            padding: 10px 20px; font-size: 13px;
            display: flex; align-items: center; justify-content: space-between;
          }
          .preview-banner a { color: #86efac; text-decoration: none; font-weight: 600; }
          .mock-site {
            max-width: 900px; margin: 40px auto; padding: 0 20px;
          }
          .mock-hero {
            background: white; border-radius: 16px; padding: 60px 40px;
            text-align: center; box-shadow: 0 1px 8px rgba(0,0,0,.06);
            margin-bottom: 24px;
          }
          .mock-hero h1 { font-size: 2rem; color: #1a1a1a; margin-bottom: 12px; }
          .mock-hero p { color: #6b7280; font-size: 1.1rem; }
          .mock-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .mock-card {
            background: white; border-radius: 12px; padding: 24px;
            box-shadow: 0 1px 4px rgba(0,0,0,.06);
          }
          .mock-card h3 { font-size: 1rem; color: #1a1a1a; margin-bottom: 8px; }
          .mock-card p { font-size: 0.875rem; color: #6b7280; }
          .label {
            display: inline-flex; align-items: center; gap: 6px;
            background: #dcfce7; color: #2D6A4F; border-radius: 20px;
            padding: 4px 12px; font-size: 12px; font-weight: 600; margin-bottom: 32px;
          }
        `}</style>
      </head>
      <body>
        <div className="preview-banner">
          <span>🐾 Vista previa del widget — <strong>{clinic.name}</strong></span>
          <a href="/dashboard">← Volver al dashboard</a>
        </div>

        {/* Fake website to show the widget in context */}
        <div className="mock-site">
          <div className="mock-hero">
            <div className="label">🐾 Sitio web de ejemplo</div>
            <h1>{clinic.name}</h1>
            <p>Bienvenido a nuestra clínica veterinaria. El chat aparece en la esquina inferior derecha.</p>
          </div>
          <div className="mock-cards">
            {['Consulta general', 'Vacunación', 'Cirugía'].map(s => (
              <div key={s} className="mock-card">
                <h3>{s}</h3>
                <p>Pregunta al asistente virtual sobre precios y disponibilidad.</p>
              </div>
            ))}
          </div>
        </div>

        {/* Real widget */}
        <script
          src={`${appUrl}/widget.js`}
          data-clinic-id={params.clinicId}
          defer
        />
      </body>
    </html>
  )
}
