import { GoogleGenAI } from '@google/genai'

export const runtime = 'edge'

const genai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY })

export async function POST(req: Request) {
  try {
    const { messages, top_k: reqTopK, top_p: reqTopP } = await req.json()
    console.log('Received messages:', messages, 'top_k:', reqTopK, 'top_p:', reqTopP)

    // Tambahkan pesan sistem di awal daftar pesan
    const systemMessage = {
      role: 'system',
      content: 'Anda adalah seorang Ustad yang bijaksana, berpengalaman, dan memahami ajaran Islam secara luas (al-Qur\'an, Hadis, fiqh, akidah, etika, dan sejarah). Jawablah dengan sopan, penuh empati, dan jelas. Jika topik membutuhkan penafsiran hukum (fatwa) atau konsultasi ahli, jelaskan batasan kewenangan Anda dan sarankan pengguna menghubungi ulama atau otoritas lokal — jangan berikan fatwa yang mengikat. Ketika merujuk pada teks agama, sebutkan sumber jika memungkinkan (mis. surat:ayat atau perawi hadis) dan berikan konteks singkat. Untuk saran praktis, berikan langkah yang mudah diikuti, opsi alternatif, dan jelaskan implikasi jika relevan. Ajukan pertanyaan klarifikasi bila konteks tidak cukup. Gunakan bahasa yang inklusif, hindari debat provokatif, dan hormati perbedaan mazhab serta konteks budaya.'
    }

    // Gabungkan pesan menjadi format yang sesuai untuk library GenAI
    const inputMessages = [systemMessage, ...messages]

    // Gunakan model Gemini (pilih varian sesuai kebutuhan)
    const model = 'gemini-3-flash-preview'

    // Map messages to a simple contents array (SDK accepts string or Content[])
    const contents = inputMessages.map((m: any) => (typeof m === 'string' ? m : m.content))

    // sampling params with sensible defaults for a chat assistant
    const top_k = typeof reqTopK === 'number' ? reqTopK : 40
    const top_p = typeof reqTopP === 'number' ? reqTopP : 0.9

    // Preserve markdown formatting (headings, lists, code fences) so the
    // frontend can render a markdown preview. We avoid trimming per-stream
    // chunk to preserve spaces at chunk boundaries (prevents word concatenation).
    const cleanText = (s: string, { preserveEdges = false }: { preserveEdges?: boolean } = {}) => {
      if (!s) return ''
      let out = s
      // normalize multiple blank lines to two
      out = out.replace(/\n{3,}/g, '\n\n')
      return preserveEdges ? out : out.trim()
    }

    // Stream by default using the ai-sdk data protocol (newline-delimited parts)
    // This matches what `ai/react` expects (streamProtocol='data'). If streaming
    // fails, we fall back to a single JSON response.
    try {
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          try {
            // genai.models.generateContentStream returns a Promise<AsyncGenerator<...>>
            const iter = await genai.models.generateContentStream({ model, contents, top_k, top_p } as any)

            // The ai-sdk client expects newline-delimited parts with numeric codes,
            // for text parts the code is `0`. Each line must be like: `0:"some text"\n`
            for await (const chunk of iter) {
              const text = chunk?.text ?? ''
              // preserve leading/trailing spaces for each streamed chunk so words
              // that split across chunks don't get concatenated
              const cleaned = cleanText(text, { preserveEdges: true })
              controller.enqueue(encoder.encode(`0:${JSON.stringify(cleaned)}\n`))
            }

            // Send a finish_message part (code 'd') so the client can pick up finish reason
            controller.enqueue(encoder.encode(`d:${JSON.stringify({ finishReason: 'stop' })}\n`))
            controller.close()
          } catch (err) {
            controller.error(err)
          }
        }
      })

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      })
    } catch (err) {
      // If streaming API isn't available or throws, fall back to non-streaming
      console.warn('Streaming failed, falling back to non-streaming response', err)
    }

    const response = await genai.models.generateContent({
      model,
      contents,
      top_k,
      top_p,
    } as any)

    // Prefer `response.text` which is returned by generateContent
    const rawOutput = response?.text ?? ''
    // final non-streaming output can be trimmed safely
    const outputText = cleanText(rawOutput, { preserveEdges: false })

    console.log('Generation successful')
    return new Response(JSON.stringify({ text: outputText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in chat API:', error)
    return new Response(JSON.stringify({ error: 'An error occurred while processing your request.', details: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}