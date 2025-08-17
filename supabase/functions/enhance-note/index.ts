import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transcription } = await req.json();
    
    if (!transcription) {
      throw new Error('No transcription provided');
    }

    console.log('Processing note enhancement request');
    
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that analyzes voice note transcriptions and provides helpful summaries and insights. 

Analyze the provided transcription and return a JSON response with the following structure:
{
  "title": "A concise, descriptive title (max 60 characters)",
  "summary": "A clear, well-structured summary highlighting key points (2-4 sentences)",
  "actionItems": ["action item 1", "action item 2"],
  "keyTopics": ["topic1", "topic2", "topic3"],
  "smartTags": ["tag1", "tag2"]
}

Smart tags should categorize the content using these options:
- Team: engineering, product, marketing, finance, sales, hr, design, operations
- Type: personal, meeting, task, idea, reminder, feedback, decision, planning, research
- Other: other

Focus on:
- Creating meaningful titles that capture the essence of the content
- Writing summaries that highlight the most important information
- Extracting actionable items mentioned in the transcription
- Identifying key topics or themes
- Assigning relevant smart tags for categorization

Keep everything concise and practical for quick reference.`
          },
          {
            role: 'user',
            content: transcription
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content;
    
    try {
      const enhancement = JSON.parse(content);
      console.log('Enhancement successful:', enhancement);
      
      return new Response(
        JSON.stringify(enhancement),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback response if AI doesn't return valid JSON
      return new Response(
        JSON.stringify({
          title: "Voice Note",
          summary: content,
          actionItems: [],
          keyTopics: [],
          smartTags: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in enhance-note function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});