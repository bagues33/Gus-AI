"use client"

import { useChat } from 'ai/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ReloadIcon } from "@radix-ui/react-icons"

export default function GusAI() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    onError: (error) => {
      console.error('Error in chat:', error)
    }
  })

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Gus AI</CardTitle>
        </CardHeader>
        <CardContent>
          <img src="/ustad.webp" alt="Gus AI" className="w-full h-auto mb-4 rounded" />
          <p className="text-lg font-semibold">
            Selamat datang di Gus AI!
          </p>
          <p className="text-sm text-gray-500">
            Gus AI adalah sebuah agen AI untuk bertanya terkait agama Islam. Ibaratnya, Gus AI adalah seorang ustad yang dapat menjawab pertanyaan Anda terkait agama Islam.
          </p>
          <div className="space-y-4 mt-3">
          {messages.map(m => (
              <div key={m.id} className={`prose whitespace-pre-wrap p-2 rounded-lg ${m.role === 'user' ? 'bg-blue-500 text-white self-end' : 'bg-gray-50 text-black self-start'}`}>
                <div className="text-sm text-gray-600 mb-1">{m.role === 'user' ? 'Anda' : 'Gus AI'}</div>
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {String(m.content ?? '')}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                Gus AI sedang berpikir...
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <form onSubmit={handleSubmit} className="flex space-x-2 w-full">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Ketik pertanyaan Anda tentang Islam..."
              className="flex-grow"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim
                </>
              ) : (
                'Kirim'
              )}
            </Button>
          </form>
        </CardFooter>
      </Card>
      <footer className="mt-4 text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Gus AI. All rights reserved. Created by <a href="https://github.com/bagues33" target="_blank" rel="noopener noreferrer" className="underline">Tofan Bagus Apriyanto</a>
      </footer>
    </div>
  )
}