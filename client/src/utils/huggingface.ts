import { HF_API_KEY } from '@/lib/env';

/**
 * Analyzes an email address for suspicious patterns using Hugging Face AI models
 * 
 * @param email - The email address to analyze
 * @returns A score indicating the likelihood of being a temporary email (0-100)
 */
export async function analyzeEmailWithAI(email: string): Promise<{
  score: number;
  explanation: string;
}> {
  try {
    // Don't proceed if the API key is not available
    if (!HF_API_KEY) {
      console.warn('Hugging Face API key not available');
      return {
        score: 0,
        explanation: 'AI analysis unavailable (API key missing)'
      };
    }

    // Extract the domain part for analysis
    const domain = email.split('@')[1];
    
    if (!domain) {
      return {
        score: 0,
        explanation: 'Invalid email format'
      };
    }
    
    // Create a prompt that asks the model to analyze the email domain
    const prompt = `
    You are a cybersecurity expert specializing in detecting temporary, disposable, or suspicious email domains.
    
    Analyze the following email domain: ${domain}
    
    Provide:
    1. A score from 0-100 indicating the likelihood this is a temporary or disposable email service (higher = more likely)
    2. A brief explanation of your reasoning
    
    Format your response exactly as:
    Score: [number between 0-100]
    Explanation: [your brief analysis]
    `;
    
    // Call the Hugging Face API
    const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 150,
          temperature: 0.3,
          top_p: 0.9,
          do_sample: true
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }
    
    const result = await response.json();
    const generatedText = result[0]?.generated_text || '';
    
    // Extract score and explanation from the generated text
    const scoreMatch = generatedText.match(/Score:\s*(\d+)/i);
    const explanationMatch = generatedText.match(/Explanation:\s*([\s\S]+)$/i);
    
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    const explanation = explanationMatch 
      ? explanationMatch[1].trim()
      : 'No explanation provided';
    
    return {
      score: Math.min(100, Math.max(0, score)), // Ensure score is between 0-100
      explanation
    };
  } catch (error) {
    console.error('Error analyzing email with AI:', error);
    return {
      score: 0,
      explanation: 'Error performing AI analysis'
    };
  }
}