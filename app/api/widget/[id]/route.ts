import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  // Get agent details from database
  const supabase = createClient()

  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !agent) {
    return new NextResponse('Agent not found', { status: 404 })
  }

  // Return the widget HTML/JS
  const widgetCode = `
    (function() {
      // Widget configuration
      const config = {
        agentId: '${id}',
        apiUrl: '${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}',
        position: 'bottom-right',
        primaryColor: '${agent.primary_color || '#000000'}',
        welcomeMessage: '${agent.welcome_message || 'Hi! How can I help you today?'}',
        agentName: '${agent.name || 'Assistant'}'
      };

      // Create widget container
      const container = document.createElement('div');
      container.id = 'alonchat-widget';
      container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;';

      // Create chat button
      const button = document.createElement('button');
      button.id = 'alonchat-button';
      button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L1 23l6.71-1.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.41 0-2.73-.36-3.88-.99l-.28-.15-3.04.89.89-3.04-.15-.28C4.36 14.73 4 13.41 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/></svg>';
      button.style.cssText = \`
        width:60px;
        height:60px;
        border-radius:30px;
        background-color:\${config.primaryColor};
        border:none;
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 4px 6px rgba(0,0,0,0.1);
        transition:all 0.3s;
      \`;
      button.onmouseover = () => button.style.transform = 'scale(1.1)';
      button.onmouseout = () => button.style.transform = 'scale(1)';

      // Create chat window
      const chatWindow = document.createElement('div');
      chatWindow.id = 'alonchat-window';
      chatWindow.style.cssText = \`
        display:none;
        position:fixed;
        bottom:100px;
        right:20px;
        width:380px;
        height:600px;
        background:white;
        border-radius:16px;
        box-shadow:0 10px 40px rgba(0,0,0,0.15);
        z-index:99999;
        overflow:hidden;
        flex-direction:column;
      \`;

      // Create iframe for chat interface
      const iframe = document.createElement('iframe');
      iframe.src = \`\${config.apiUrl}/widget/chat/\${config.agentId}\`;
      iframe.style.cssText = 'width:100%;height:100%;border:none;';
      iframe.setAttribute('allow', 'microphone');

      chatWindow.appendChild(iframe);

      // Toggle chat window
      button.onclick = () => {
        const isVisible = chatWindow.style.display === 'flex';
        chatWindow.style.display = isVisible ? 'none' : 'flex';

        // Send open event to iframe
        if (!isVisible) {
          setTimeout(() => {
            iframe.contentWindow.postMessage({
              type: 'ALONCHAT_OPENED',
              config: config
            }, config.apiUrl);
          }, 100);
        }
      };

      // Append to document
      container.appendChild(button);
      container.appendChild(chatWindow);

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          document.body.appendChild(container);
        });
      } else {
        document.body.appendChild(container);
      }

      // Listen for messages from iframe
      window.addEventListener('message', (event) => {
        if (event.origin !== config.apiUrl) return;

        if (event.data.type === 'ALONCHAT_CLOSE') {
          chatWindow.style.display = 'none';
        } else if (event.data.type === 'ALONCHAT_MINIMIZE') {
          chatWindow.style.display = 'none';
        }
      });
    })();
  `;

  return new NextResponse(widgetCode, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    }
  })
}