import { useEffect, useRef } from 'react';

export default function ConsolePanel({ messages }) {
  const messagesEndRef = useRef(null);

  // Auto-scroll hacia el final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-full p-4 overflow-y-auto font-mono text-sm">
      <div className="space-y-2">
        {messages.map((message, index) => (
          <div key={index} className="console-line fade-in">
            <span className="text-slate-500 text-xs">
              [{new Date().toLocaleTimeString()}]
            </span>
            <span className="text-slate-200 ml-2">{message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Mensaje cuando no hay mensajes */}
      {messages.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <div className="text-3xl mb-2">💻</div>
          <p className="text-sm">Los mensajes de la consola aparecerán aquí...</p>
          <p className="text-xs mt-1">¡Interactúa con el juego para ver la magia de ECS!</p>
        </div>
      )}
    </div>
  );
}
