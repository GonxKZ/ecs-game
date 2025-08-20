import { useState, useEffect } from 'react';

export default function ECSInspector({ world, onClose }) {
  const [activeTab, setActiveTab] = useState('world');
  const [worldStats, setWorldStats] = useState({});
  const [systems, setSystems] = useState([]);
  const [queries, setQueries] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [breakpoints, setBreakpoints] = useState(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [frameHistory, setFrameHistory] = useState([]);

  // Usar selectedSystem y selectedQuery para debugging
  const debugSelectedItems = () => {
    if (selectedSystem) {
      console.log('Sistema seleccionado para debugging:', selectedSystem);
    }
    if (selectedQuery) {
      console.log('Query seleccionada para debugging:', selectedQuery);
    }
  };

  // Actualizar datos del mundo
  useEffect(() => {
    if (!world) return;

    // Llamar a debug cuando cambien las selecciones
    debugSelectedItems();

    const updateWorldStats = () => {
      const stats = {
        entities: world.entityManager?.getStats() || {},
        components: world.storageManager?.getStats() || {},
        scheduler: world.scheduler?.getStats() || {},
        eventBus: world.eventBus?.getStats() || {},
        totalEntities: world.entityManager?.stats?.alive || 0,
        totalComponents: Object.keys(world.components || {}).length,
        totalSystems: world.systems?.size || 0
      };
      setWorldStats(stats);
    };

    const updateSystems = () => {
      const systemList = Array.from(world.systems?.entries() || []).map(([name, system]) => ({
        name,
        system,
        executionTime: system.lastExecutionTime || 0,
        dependencies: world.scheduler?.dependencies.get(name) || []
      }));
      setSystems(systemList);
    };

    const updateQueries = () => {
      const queryList = Array.from(world.queries?.entries() || []).map(([queryId, entities]) => ({
        id: queryId,
        signature: `Query_${queryId}`,
        entities: Array.from(entities),
        entityCount: entities.size,
        efficiency: entities.size / (performance.now() || 1)
      }));
      setQueries(queryList);
    };

    const updateEvents = () => {
      const eventList = world.eventBus?.getStats() ? [
        { type: 'Input', count: world.eventBus.stats.eventsProcessed, lastTime: Date.now() },
        { type: 'Damage', count: world.eventBus.stats.eventsProcessed, lastTime: Date.now() },
        { type: 'Spawn', count: world.eventBus.stats.eventsProcessed, lastTime: Date.now() },
        { type: 'Collision', count: world.eventBus.stats.eventsProcessed, lastTime: Date.now() }
      ] : [];
      setEvents(eventList);
    };

    updateWorldStats();
    updateSystems();
    updateQueries();
    updateEvents();

    const interval = setInterval(() => {
      updateWorldStats();
      updateSystems();
      updateQueries();
      updateEvents();
    }, 500);

    return () => clearInterval(interval);
  }, [world]);

  // Sistema de breakpoints
  const toggleBreakpoint = (systemName) => {
    const newBreakpoints = new Set(breakpoints);
    if (newBreakpoints.has(systemName)) {
      newBreakpoints.delete(systemName);
    } else {
      newBreakpoints.add(systemName);
    }
    setBreakpoints(newBreakpoints);

    // Aplicar breakpoint al scheduler
    if (world.scheduler) {
      if (newBreakpoints.has(systemName)) {
        world.scheduler.setBreakpoint(systemName);
      } else {
        world.scheduler.clearBreakpoint(systemName);
      }
    }
  };

  // Grabación de frames
  useEffect(() => {
    if (!isRecording || !world) return;

    const recordFrame = () => {
      const frameData = {
        timestamp: Date.now(),
        entities: world.entityManager?.stats?.alive || 0,
        systems: systems.length,
        queries: queries.length,
        events: world.eventBus?.stats?.eventsProcessed || 0
      };
      setFrameHistory(prev => [...prev.slice(-100), frameData]);
    };

    const interval = setInterval(recordFrame, 100);
    return () => clearInterval(interval);
  }, [isRecording, world, systems.length, queries.length]);

  const getTimeColor = (time) => {
    if (time > 16) return 'text-red-400';
    if (time > 8) return 'text-yellow-400';
    return 'text-green-400';
  };

  const tabs = [
    { id: 'world', label: '🌍 Mundo', icon: '🌍' },
    { id: 'systems', label: '⚙️ Sistemas', icon: '⚙️' },
    { id: 'queries', label: '🔍 Consultas', icon: '🔍' },
    { id: 'events', label: '📡 Eventos', icon: '📡' }
  ];

  return (
    <div className="fixed top-4 right-4 w-96 h-[600px] bg-gray-900/95 backdrop-blur-sm rounded-lg border border-cyan-500/30 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-cyan-500/30">
        <h3 className="text-cyan-400 font-bold text-lg">🔍 ECS Inspector</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            {isRecording ? '⏹️' : '⏺️'}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg"
          >
            ×
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'world' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <h4 className="text-green-400 font-semibold mb-2">📊 Entidades</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Vivas:</span>
                    <span className="text-white">{worldStats.entities?.aliveEntities || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Creadas:</span>
                    <span className="text-white">{worldStats.entities?.created || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Destruídas:</span>
                    <span className="text-white">{worldStats.entities?.destroyed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reutilizadas:</span>
                    <span className="text-white">{worldStats.entities?.reused || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 p-3 rounded-lg">
                <h4 className="text-blue-400 font-semibold mb-2">💾 Componentes</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="text-white">{worldStats.totalComponents}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Almacenamiento:</span>
                    <span className="text-white">{worldStats.components?.totalMemory || 0}KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Load Factor:</span>
                    <span className={`font-bold ${worldStats.entities?.isOverloaded ? 'text-red-400' : 'text-green-400'}`}>
                      {worldStats.entities?.loadFactor?.toFixed(1) || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 p-3 rounded-lg">
              <h4 className="text-purple-400 font-semibold mb-2">⚡ Scheduler</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Frame Time:</span>
                  <span className={`${getTimeColor(worldStats.scheduler?.averageFrameTime || 0)}`}>
                    {worldStats.scheduler?.averageFrameTime?.toFixed(1) || 0}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sistema más lento:</span>
                  <span className="text-white text-xs">{worldStats.scheduler?.longestSystem || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frames:</span>
                  <span className="text-white">{worldStats.scheduler?.frameCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estado:</span>
                  <span className={`font-bold ${world.scheduler?.isPaused ? 'text-red-400' : 'text-green-400'}`}>
                    {world.scheduler?.isPaused ? 'Pausado' : 'Activo'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 p-3 rounded-lg">
              <h4 className="text-orange-400 font-semibold mb-2">📡 Event Bus</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Enviados:</span>
                  <span className="text-white">{worldStats.eventBus?.eventsSent || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Procesados:</span>
                  <span className="text-white">{worldStats.eventBus?.eventsProcessed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cola máxima:</span>
                  <span className="text-white">{worldStats.eventBus?.maxQueueLength || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tiempo promedio:</span>
                  <span className="text-white">{worldStats.eventBus?.averageProcessingTime?.toFixed(2) || 0}ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'systems' && (
          <div className="space-y-2">
            <h4 className="text-cyan-400 font-semibold mb-3">⚙️ Sistemas Activos ({systems.length})</h4>
            {systems.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No hay sistemas registrados</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {systems.map(({ name, system, executionTime, dependencies }) => (
                  <div key={name} className="bg-gray-800/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleBreakpoint(name)}
                          className={`w-4 h-4 rounded-full border-2 transition-colors ${
                            breakpoints.has(name)
                              ? 'bg-red-500 border-red-400'
                              : 'bg-gray-600 border-gray-500 hover:bg-gray-500'
                          }`}
                          title={breakpoints.has(name) ? 'Quitar breakpoint' : 'Añadir breakpoint'}
                        />
                        <span className="text-white font-medium">{name}</span>
                      </div>
                      <div className={`${getTimeColor(executionTime)} text-sm font-mono`}>
                        {executionTime.toFixed(2)}ms
                      </div>
                    </div>
                    {dependencies.length > 0 && (
                      <div className="text-xs text-gray-400 mb-2">
                        <span className="font-medium">Dependencias:</span> {dependencies.join(', ')}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      {system.requiredComponents?.length > 0 && (
                        <div>Componentes: {system.requiredComponents.join(', ')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'queries' && (
          <div className="space-y-2">
            <h4 className="text-green-400 font-semibold mb-3">🔍 Consultas Activas ({queries.length})</h4>
            {queries.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No hay consultas activas</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {queries.map((query) => (
                  <div key={query.id} className="bg-gray-800/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{query.signature}</span>
                      <div className="text-sm text-gray-400">
                        {query.entityCount} entidades
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Eficiencia: {(query.efficiency * 100).toFixed(1)} ent/ms
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-2">
            <h4 className="text-yellow-400 font-semibold mb-3">📡 Sistema de Eventos</h4>

            <div className="bg-gray-800/50 p-3 rounded-lg mb-4">
              <h5 className="text-white font-medium mb-2">Estadísticas Globales</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Total procesados:</span>
                  <span className="text-white">{worldStats.eventBus?.eventsProcessed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>En cola:</span>
                  <span className="text-white">{worldStats.eventBus?.maxQueueLength || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tiempo promedio:</span>
                  <span className="text-white">{worldStats.eventBus?.averageProcessingTime?.toFixed(2) || 0}ms</span>
                </div>
              </div>
            </div>

            <h5 className="text-white font-medium mb-2">Tipos de Eventos</h5>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.map((event, index) => (
                <div key={index} className="bg-gray-800/50 p-2 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{event.type}</span>
                    <div className="text-sm text-gray-400">
                      {event.count} eventos
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Último: {new Date(event.lastTime).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-2 left-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}

      {/* Footer */}
      <div className="p-3 bg-gray-800/50 border-t border-gray-700 text-xs text-gray-400">
        💡 Usa breakpoints para pausar antes de ejecutar sistemas. {frameHistory.length} frames grabados.
      </div>
    </div>
  );
}
