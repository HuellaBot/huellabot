import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export function buildSystemPrompt(clinic: {
  name: string
  description: string
  services: Array<{ name: string; price: string; duration?: string }>
  hours: string
  phone: string
  address: string
  bot_name: string
  bot_tone: string
  extra_info: string
}): string {
  const servicesList = clinic.services
    .map(s => `- ${s.name}: $${s.price}${s.duration ? ` (${s.duration})` : ''}`)
    .join('\n')

  return `Eres ${clinic.bot_name}, el asistente virtual de ${clinic.name}.

Tu personalidad es ${clinic.bot_tone}.

INFORMACIÓN DE LA CLÍNICA:
${clinic.description}

SERVICIOS Y PRECIOS:
${servicesList}

HORARIOS: ${clinic.hours}
TELÉFONO: ${clinic.phone}
DIRECCIÓN: ${clinic.address}

${clinic.extra_info ? `INFORMACIÓN ADICIONAL:\n${clinic.extra_info}` : ''}

INSTRUCCIONES:
- Responde siempre en español de manera ${clinic.bot_tone}
- Si te preguntan por servicios no listados, di que consultarán con el equipo
- Para emergencias, indica siempre el teléfono de la clínica
- No inventes precios ni información que no tengas
- Puedes ayudar a agendar citas indicando el teléfono o que el equipo contactará al cliente
- Sé conciso y útil`
}
