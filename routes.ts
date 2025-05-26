import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Ultraviolet-style proxy endpoint
  app.get('/uv/service/:encoded', async (req, res) => {
    try {
      const encoded = req.params.encoded;
      const url = Buffer.from(encoded, 'base64').toString('utf-8');
      
      // Import fetch dynamically
      const fetch = (await import('node-fetch')).default;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      // Add CORS and security headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Content-Type', response.headers.get('content-type') || 'text/html');

      if (response.body) {
        response.body.pipe(res);
      } else {
        res.end();
      }
    } catch (error: any) {
      res.status(500).send('Proxy error: ' + error.message);
    }
  });

  // OpenAI Chat endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: 'system',
              content: 'You are MisTunnel AI, a helpful assistant for the MisTunnel platform. You help users with gaming, proxy browsing, and platform features. Be friendly and knowledgeable.'
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices[0].message.content;

      res.json({ reply });
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      res.status(500).json({ error: 'Failed to get AI response' });
    }
  });

  // Legacy proxy endpoint
  app.get('/proxy', async (req, res) => {
    const url = req.query.url as string;

    if (!url) {
      return res.status(400).send('Error: Missing "url" query parameter.');
    }

    try {
      // Validate URL
      const validUrl = new URL(url);

      // Import fetch dynamically
      const fetch = (await import('node-fetch')).default;

      // Fetch the requested URL
      const response = await fetch(validUrl.href, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      // Get content type from response headers
      const contentType = response.headers.get('content-type') || 'text/plain';

      // Set same content type for response
      res.setHeader('Content-Type', contentType);
      
      // Add CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Stream the response body back to the client
      if (response.body) {
        response.body.pipe(res);
      } else {
        res.end();
      }

    } catch (error: any) {
      res.status(500).send('Failed to fetch the URL. Error: ' + error.message);
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
