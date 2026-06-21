import { streamText } from 'ai'

const result = streamText({
  model: 'openai/gpt-5.5',
  prompt: 'Explain quantum computing in simple terms.',
  onError({ error }) {
    console.error('\nAI Gateway error:', error)
  },
})

for await (const chunk of result.textStream) {
  process.stdout.write(chunk)
}

process.stdout.write('\n')
