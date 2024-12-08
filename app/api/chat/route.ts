export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    console.log('Request received')
    const { messages } = await req.json()
    console.log('Messages parsed:', messages)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error(`OpenAI API error: ${response.statusText}`, errorData)
      return new Response(JSON.stringify({ error: errorData.error.message }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder('utf-8')
    const stream = new ReadableStream({
      async start(controller) {
        while (true) {
          const { done, value } = await reader?.read() || {}
          if (done) break
          controller.enqueue(decoder.decode(value))
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    })
  } catch (error) {
    console.error('Error in chat API:', error)
    return new Response(JSON.stringify({ error: 'An error occurred while processing your request.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}