import { useState, useEffect } from 'react';

export default function ECSDebugger({ world, scheduler, onClose }) {
  const [activeTab, setActiveTab] = useState('world');
  const [breakpoints, setBreakpoints] = useState(new Set());
  const [frameHistory, setFrameHistory] = useState([]);
  const [isRecording, setIsRecording] = useState(false);

  // Capturar snapshots de frames
  useEffect(() => {
    if (!isRecording) return;

    const captureFrame = () => {
      if (!world) return;

      const snapshot = {
        timestamp: performance.now(),
        entities: world.entities.size,
        components: {},
        systems: {}
      };

      // Capturar estado de componentes
      for (const [componentType, componentMap] of world.components) {
        snapshot.components[componentType] = {
          count: componentMap.size,
          sample: Array.from(componentMap.entries()).slice(0, 3)
        };
      }

      // Capturar estado de sistemas
      if (scheduler) {
        const stats = scheduler.getStats();
        snapshot.systems = stats.systems || {};
      }

      setFrameHistory(prev => [...prev, snapshot].slice(-50)); // Mantener últimos 50 frames
    };

    const interval = setInterval(captureFrame, 100);
    return () => clearInterval(interval);
  }, [isRecording, world, scheduler]);

  const toggleBreakpoint = (systemName) => {
    const newBreakpoints = new Set(breakpoints);
    if (newBreakpoints.has(systemName)) {
      newBreakpoints.delete(systemName);
    } else {
      newBreakpoints.add(systemName);
    }
    setBreakpoints(newBreakpoints);
  };



  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-800 p-6 rounded-lg max-w-6xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">🐛 ECS Debugger</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`px-3 py-1 rounded ${isRecording ? 'bg-red-600' : 'bg-green-600'} hover:opacity-80`}
            >
              {isRecording ? '⏹️ Stop Recording' : '⏺️ Start Recording'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-slate-700 rounded-lg p-1">
          {['world', 'systems', 'queries', 'events'].map(tab => (
            <button
              key={tab}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === tab
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-600'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'world' && '🌍 Mundo'}
              {tab === 'systems' && '⚙️ Sistemas'}
              {tab === 'queries' && '🔍 Queries'}
              {tab === 'events' && '📡 Eventos'}
            </button>
          ))}
        </div>

        {/* Contenido de las tabs */}
        <div className="space-y-6">
          {activeTab === 'world' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-green-400">🌍 Estado del Mundo</h3>

              {/* Entidades */}
              <div className="mb-6">
                <h4 className="text-md font-semibold mb-2 text-blue-400">🏗️ Entidades</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-700 p-4 rounded">
                    <div className="text-2xl font-bold text-cyan-400">{world.entities.size}</div>
                    <div className="text-sm text-slate-400">Entidades Activas</div>
                  </div>
                  <div className="bg-slate-700 p-4 rounded">
                    <div className="text-2xl font-bold text-green-400">{world.entityManager?.getStats().aliveEntities || 0}</div>
                    <div className="text-sm text-slate-400">Entidades Generacionales</div>
                  </div>
                  <div className="bg-slate-700 p-4 rounded">
                    <div className="text-2xl font-bold text-yellow-400">{world.entityManager?.getStats().loadFactor.toFixed(1) || 0}%</div>
                    <div className="text-sm text-slate-400">Factor de Carga</div>
                  </div>
                </div>
              </div>

              {/* Componentes */}
              <div className="mb-6">
                <h4 className="text-md font-semibold mb-2 text-purple-400">📦 Componentes</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Array.from(world.components.entries()).map(([componentType, componentMap]) => (
                    <div key={componentType} className="bg-slate-700 p-3 rounded">
                      <div className="font-mono text-sm text-cyan-400">{componentType}</div>
                      <div className="text-lg font-bold text-white">{componentMap.size}</div>
                      <div className="text-xs text-slate-400">instancias</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'systems' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-green-400">⚙️ Depuración de Sistemas</h3>

              {/* Breakpoints */}
              <div className="mb-6">
                <h4 className="text-md font-semibold mb-2 text-red-400">🔴 Breakpoints</h4>
                <div className="space-y-2">
                  {Array.from(world.systems.entries()).map(([name, system]) => (
                    <div key={name} className="flex items-center justify-between bg-slate-700 p-3 rounded">
                      <div>
                        <span className="font-mono text-sm text-cyan-400">{name}</span>
                        <span className="text-xs text-slate-400 ml-2">({system.constructor.name})</span>
                      </div>
                      <button
                        onClick={() => toggleBreakpoint(name)}
                        className={`px-3 py-1 rounded text-xs ${
                          breakpoints.has(name) ? 'bg-red-600' : 'bg-slate-600'
                        } hover:opacity-80`}
                      >
                        {breakpoints.has(name) ? '⏹️' : '⏯️'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline de ejecución */}
              <div className="mb-6">
                <h4 className="text-md font-semibold mb-2 text-blue-400">⏰ Timeline de Ejecución</h4>
                <div className="bg-slate-700 p-4 rounded">
                  <div className="text-sm text-slate-400 mb-2">
                    Últimos 10 frames - {frameHistory.length} frames grabados
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {frameHistory.slice(-10).map((frame, index) => (
                      <div key={index} className="text-xs font-mono">
                        <span className="text-slate-500">Frame {frameHistory.length - 10 + index}:</span>
                        <span className="ml-2">
                          Entidades: {frame.entities},
                          Sistemas: {Object.keys(frame.systems).length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'queries' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-green-400">🔍 Análisis de Queries</h3>

              {/* Query Inspector */}
              <div className="bg-slate-700 p-4 rounded">
                <div className="text-sm text-slate-400 mb-2">
                  Las queries se ejecutan automáticamente. Monitoriza su rendimiento aquí.
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">{world.queries.size}</div>
                    <div className="text-sm text-slate-400">Queries Activas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {Array.from(world.queries.values()).reduce((sum, set) => sum + set.size, 0)}
                    </div>
                    <div className="text-sm text-slate-400">Entidades Matcheadas</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-green-400">📡 Sistema de Eventos</h3>

              {/* Estadísticas de eventos */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-700 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-cyan-400">{world.eventBus?.getStats().eventsSent || 0}</div>
                  <div className="text-sm text-slate-400">Eventos Enviados</div>
                </div>
                <div className="bg-slate-700 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-green-400">{world.eventBus?.getStats().eventsProcessed || 0}</div>
                  <div className="text-sm text-slate-400">Eventos Procesados</div>
                </div>
                <div className="bg-slate-700 p-4 rounded text-center">
                  <div className="text-2xl font-bold text-yellow-400">{world.eventBus?.getStats().totalSubscribers || 0}</div>
                  <div className="text-sm text-slate-400">Suscriptores</div>
                </div>
              </div>

              {/* Tipos de eventos */}
              <div className="bg-slate-700 p-4 rounded">
                <h4 className="text-md font-semibold mb-3 text-blue-400">🎯 Tipos de Eventos</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['Input', 'Damage', 'Spawn', 'Death', 'Collision', 'Pickup'].map(eventType => (
                    <div key={eventType} className="bg-slate-600 p-2 rounded text-center">
                      <div className="font-mono text-sm text-cyan-400">{eventType}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Consejos de debugging */}
        <div className="mt-6 bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">🐛 Consejos de Debugging</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• Usa breakpoints para pausar antes de ejecutar sistemas problemáticos</li>
            <li>• Graba frames para comparar cambios entre estados</li>
            <li>• Monitoriza el factor de carga para evitar reallocations frecuentes</li>
            <li>• Los eventos lock-free garantizan thread-safety sin bloqueos</li>
            <li>• El double buffering evita inconsistencias durante la ejecución</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
