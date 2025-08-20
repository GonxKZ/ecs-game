import { useState, useEffect } from 'react';

export default function AudioXRayVisualizer({ audioXRaySystem, onClose }) {
  const [eventHistory, setEventHistory] = useState([]);
  const [stats, setStats] = useState({});
  const [isVisible, setIsVisible] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  // Usar onClose para funcionalidad de cierre
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  // Actualizar datos del sistema
  useEffect(() => {
    if (!audioXRaySystem) return;

    const updateData = () => {
      setEventHistory([...audioXRaySystem.getEventHistory()]);
      setStats(audioXRaySystem.getStats());
    };

    updateData();
    const interval = setInterval(updateData, 100); // Actualizar cada 100ms
    return () => clearInterval(interval);
  }, [audioXRaySystem]);

  // Auto-scroll al final
  useEffect(() => {
    if (autoScroll && eventHistory.length > 0) {
      const container = document.getElementById('event-history-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [eventHistory, autoScroll]);

  const getEventColor = (eventType) => {
    const colors = {
      'Input': 'text-blue-400',
      'Damage': 'text-red-400',
      'Spawn': 'text-green-400',
      'Death': 'text-purple-400',
      'Collision': 'text-yellow-400',
      'Pickup': 'text-cyan-400',
      'LevelComplete': 'text-pink-400',
      'SystemMessage': 'text-gray-400',
      'Render': 'text-indigo-400',
      'Physics': 'text-orange-400',
      'Audio': 'text-teal-400',
      'Network': 'text-violet-400'
    };
    return colors[eventType] || 'text-white';
  };

  const getFrequencyRange = (frequency) => {
    if (frequency < 100) return 'Sub-bass';
    if (frequency < 250) return 'Bass';
    if (frequency < 500) return 'Mid-low';
    if (frequency < 1000) return 'Mid';
    if (frequency < 2000) return 'Mid-high';
    if (frequency < 4000) return 'High';
    return 'Very high';
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 2
    });
  };

  if (!isVisible) {
    return (
      <div
        className="fixed top-20 left-4 z-50 bg-black/80 text-white px-3 py-2 rounded text-sm cursor-pointer border border-cyan-500/30"
        onClick={() => setIsVisible(true)}
        title="Mostrar Audio X-Ray Visualizer"
      >
        🔊 X-Ray
      </div>
    );
  }

  return (
    <div className="fixed top-20 left-4 w-96 h-[500px] bg-gray-900/95 backdrop-blur-sm rounded-lg border border-cyan-500/30 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-cyan-500/30">
        <h3 className="text-cyan-400 font-bold text-lg">🔊 Audio X-Ray Visualizer</h3>
        <div className="flex gap-2">
          <button
            onClick={() => audioXRaySystem.setEnabled(!stats.isEnabled)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              stats.isEnabled ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
            } text-white`}
          >
            {stats.isEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white text-lg"
          >
            ×
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Eventos:</span>
            <span className="ml-1 text-white">{stats.eventsProcessed || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Sonidos:</span>
            <span className="ml-1 text-white">{stats.soundsPlayed || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Estado:</span>
            <span className={`ml-1 font-bold ${stats.isEnabled ? 'text-green-400' : 'text-red-400'}`}>
              {stats.isEnabled ? 'Habilitado' : 'Deshabilitado'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Inicializado:</span>
            <span className={`ml-1 ${stats.isInitialized ? 'text-green-400' : 'text-red-400'}`}>
              {stats.isInitialized ? 'Sí' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Event History */}
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-white font-semibold">📝 Historial de Eventos</h4>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="form-checkbox h-3 w-3 text-cyan-600 rounded"
            />
            <span className="text-gray-400">Auto-scroll</span>
          </label>
        </div>

        <div
          id="event-history-container"
          className="h-64 overflow-y-auto bg-black/30 rounded p-2 space-y-1"
        >
          {eventHistory.length === 0 ? (
            <div className="text-gray-500 text-center py-4 text-sm">
              No hay eventos registrados
            </div>
          ) : (
            eventHistory.map((event, index) => (
              <div key={index} className="text-xs border-l-2 border-cyan-500/50 pl-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${getEventColor(event.type)}`}>
                    🎵 {event.type}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {formatTime(event.timestamp)}
                  </span>
                </div>
                <div className="text-gray-400 text-xs">
                  <span>Frecuencia: {event.frequency}Hz ({getFrequencyRange(event.frequency)})</span>
                </div>
                {event.senderId > 0 && (
                  <div className="text-gray-400 text-xs">
                    <span>Entidad: #{event.senderId}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Event Counts */}
      <div className="p-4 border-t border-gray-700">
        <h4 className="text-white font-semibold mb-2">📊 Contadores por Tipo</h4>
        <div className="grid grid-cols-2 gap-1 text-xs max-h-32 overflow-y-auto">
          {stats.eventCounts && Object.entries(stats.eventCounts).map(([type, count]) => (
            <div key={type} className="flex justify-between items-center">
              <span className={`${getEventColor(type)}`}>{type}:</span>
              <span className="text-white ml-2">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-800/50 border-t border-gray-700 text-xs text-gray-400">
        💡 Cada tipo de evento tiene un tono único para debugging auditivo
      </div>
    </div>
  );
}
