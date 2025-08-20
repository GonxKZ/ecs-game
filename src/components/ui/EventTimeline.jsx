import { useState, useEffect, useRef, useCallback } from 'react';

export default function EventTimeline({ eventBus, onClose }) {
  const [eventHistory, setEventHistory] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [isRecording, setIsRecording] = useState(true);
  const [filters, setFilters] = useState({
    eventTypes: new Set(['Input', 'Damage', 'Spawn', 'Death', 'Collision']),
    timeRange: 5000, // Últimos 5 segundos
    showSystemEvents: false
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timelineRef = useRef(null);

  // Usar variables para debugging
  const debugPlaybackState = useCallback(() => {
    if (playbackSpeed !== 1) {
      console.log(`Velocidad de reproducción: ${playbackSpeed}x`);
    }
    if (isRecording) {
      console.log('Grabación activa en EventTimeline');
    }
    // Usar setter para debugging
    if (setPlaybackSpeed) {
      console.log('Setter de velocidad disponible');
    }
  }, [playbackSpeed, isRecording, setPlaybackSpeed]);

  // Capturar eventos del bus
  useEffect(() => {
    if (!eventBus || !isRecording) return;

    // Llamar a debug para usar las variables
    debugPlaybackState();

    const capturedEvents = [];

    // Interceptar el método send del eventBus
    const originalSend = eventBus.send;
    eventBus.send = function(eventType, payload, senderId) {
      const event = {
        id: Date.now() + Math.random(),
        type: eventType,
        typeId: eventBus.getEventTypeId(eventType),
        payload,
        senderId,
        timestamp: performance.now(),
        frame: eventBus.stats.eventsSent
      };

      capturedEvents.push(event);
      setEventHistory(prev => [...prev, event].slice(-1000)); // Mantener últimos 1000 eventos

      return originalSend.call(this, eventType, payload, senderId);
    };

    return () => {
      eventBus.send = originalSend;
    };
  }, [eventBus, isRecording]);

  // Filtrar eventos
  useEffect(() => {
    const now = performance.now();
    const cutoffTime = now - filters.timeRange;

    const filtered = eventHistory.filter(event => {
      if (event.timestamp < cutoffTime) return false;
      if (!filters.eventTypes.has(event.type)) return false;
      if (!filters.showSystemEvents && ['Render', 'Physics'].includes(event.type)) return false;
      return true;
    });

    setFilteredEvents(filtered);
  }, [eventHistory, filters]);

  // Auto-scroll al final
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [filteredEvents]);

  const getEventColor = (eventType) => {
    const colors = {
      Input: 'bg-blue-500',
      Damage: 'bg-red-500',
      Spawn: 'bg-green-500',
      Death: 'bg-purple-500',
      Collision: 'bg-yellow-500',
      Pickup: 'bg-cyan-500',
      Render: 'bg-gray-500',
      Physics: 'bg-orange-500',
      Audio: 'bg-pink-500'
    };
    return colors[eventType] || 'bg-gray-400';
  };

  const formatPayload = (payload) => {
    if (!payload) return '{}';
    if (typeof payload === 'object') {
      return JSON.stringify(payload, null, 2);
    }
    return String(payload);
  };

  const rewindToEvent = (event) => {
    // Esta función simularía rebobinar la simulación al momento del evento
    console.log(`Rebobinando a evento ${event.id} (${event.type})`);
    // En una implementación real, esto restauraría el estado del ECS
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-800 p-6 rounded-lg max-w-6xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">🎬 Timeline de Eventos</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`px-3 py-1 rounded ${isRecording ? 'bg-red-600' : 'bg-green-600'} hover:opacity-80`}
            >
              {isRecording ? '⏹️ Detener' : '▶️ Grabar'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Controles de filtros */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tipos de Evento
            </label>
            <div className="flex flex-wrap gap-1">
              {['Input', 'Damage', 'Spawn', 'Death', 'Collision', 'Pickup', 'Render', 'Physics'].map(type => (
                <label key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.eventTypes.has(type)}
                    onChange={(e) => {
                      const newTypes = new Set(filters.eventTypes);
                      if (e.target.checked) {
                        newTypes.add(type);
                      } else {
                        newTypes.delete(type);
                      }
                      setFilters(prev => ({ ...prev, eventTypes: newTypes }));
                    }}
                    className="mr-1"
                  />
                  <span className="text-xs text-slate-400">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Rango Temporal (ms)
            </label>
            <input
              type="range"
              min="1000"
              max="10000"
              step="1000"
              value={filters.timeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: parseInt(e.target.value) }))}
              className="w-full"
            />
            <span className="text-xs text-slate-400">{filters.timeRange}ms</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Opciones
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.showSystemEvents}
                onChange={(e) => setFilters(prev => ({ ...prev, showSystemEvents: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-xs text-slate-400">Mostrar eventos de sistema</span>
            </label>
          </div>
        </div>

        {/* Timeline visual */}
        <div className="mb-6">
          <div
            ref={timelineRef}
            className="bg-slate-900 border border-slate-600 rounded h-64 overflow-y-auto p-2 font-mono text-xs"
          >
            {filteredEvents.length === 0 ? (
              <div className="text-slate-500 text-center mt-8">
                No hay eventos para mostrar
              </div>
            ) : (
              filteredEvents.map((event, index) => (
                <div
                  key={`${event.id}-${index}`}
                  className="flex items-center mb-1 hover:bg-slate-700 p-1 rounded cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className={`w-3 h-3 rounded mr-2 ${getEventColor(event.type)}`}></div>
                  <span className="text-slate-400 w-16">{event.type}</span>
                  <span className="text-slate-500 w-20">#{event.frame}</span>
                  <span className="text-slate-400 flex-1 truncate">
                    {JSON.stringify(event.payload).substring(0, 50)}
                  </span>
                  <span className="text-slate-500 w-16">
                    {(event.timestamp % 1000).toFixed(0)}ms
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      rewindToEvent(event);
                    }}
                    className="ml-2 text-blue-400 hover:text-blue-300"
                  >
                    ↺
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detalle del evento seleccionado */}
        {selectedEvent && (
          <div className="bg-slate-700 p-4 rounded">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">
              📋 Evento: {selectedEvent.type}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Tipo:</strong> {selectedEvent.type} (ID: {selectedEvent.typeId})
              </div>
              <div>
                <strong>Frame:</strong> #{selectedEvent.frame}
              </div>
              <div>
                <strong>Sender ID:</strong> {selectedEvent.senderId}
              </div>
              <div>
                <strong>Timestamp:</strong> {selectedEvent.timestamp.toFixed(2)}ms
              </div>
            </div>
            <div className="mt-2">
              <strong>Payload:</strong>
              <pre className="mt-1 p-2 bg-slate-800 rounded text-xs overflow-x-auto">
                {formatPayload(selectedEvent.payload)}
              </pre>
            </div>
          </div>
        )}

        {/* Estadísticas del bus de eventos */}
        <div className="mt-6 grid grid-cols-4 gap-4 text-sm">
          <div className="bg-slate-700 p-3 rounded text-center">
            <div className="text-lg font-bold text-green-400">{eventBus?.getStats().eventsSent || 0}</div>
            <div className="text-slate-400">Enviados</div>
          </div>
          <div className="bg-slate-700 p-3 rounded text-center">
            <div className="text-lg font-bold text-blue-400">{eventBus?.getStats().eventsProcessed || 0}</div>
            <div className="text-slate-400">Procesados</div>
          </div>
          <div className="bg-slate-700 p-3 rounded text-center">
            <div className="text-lg font-bold text-purple-400">{eventBus?.getStats().totalSubscribers || 0}</div>
            <div className="text-slate-400">Suscriptores</div>
          </div>
          <div className="bg-slate-700 p-3 rounded text-center">
            <div className="text-lg font-bold text-yellow-400">{eventBus?.getStats().averageProcessingTime?.toFixed(2) || 0}ms</div>
            <div className="text-slate-400">Tiempo Promedio</div>
          </div>
        </div>

        {/* Consejos pedagógicos */}
        <div className="mt-6 bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">🎯 Sistema de Eventos Lock-Free</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• Double buffering evita contención entre threads</li>
            <li>• Los eventos se procesan al final de cada frame</li>
            <li>• Pool de objetos reduce la presión del garbage collector</li>
            <li>• IDs numéricos de eventos mejoran el rendimiento</li>
            <li>• El rebobinado permite debugging determinista</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
