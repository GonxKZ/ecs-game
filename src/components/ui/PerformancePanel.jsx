import { useState, useEffect } from 'react';
import QueryInspector from './QueryInspector.jsx';
import DeltaTimeOscilloscope from './DeltaTimeOscilloscope.jsx';
import EventTimeline from './EventTimeline.jsx';

export default function PerformancePanel({ world, stats }) {
  const [performanceData, setPerformanceData] = useState([]);
  const [cacheVisualization, setCacheVisualization] = useState([]);
  const [showCacheLupa, setShowCacheLupa] = useState(false);
  const [showQueryInspector, setShowQueryInspector] = useState(false);
  const [showDeltaTimeOscilloscope, setShowDeltaTimeOscilloscope] = useState(false);
  const [showEventTimeline, setShowEventTimeline] = useState(false);
  const [archetypeInfo, setArchetypeInfo] = useState({});
  const [queryStats, setQueryStats] = useState({});
  const [storageMetrics, setStorageMetrics] = useState({});
  const [schedulerStats, setSchedulerStats] = useState({});

  // Actualizar datos de rendimiento
  useEffect(() => {
    if (!world) return;

    const updatePerformanceData = () => {
      const educationalStats = world.getEducationalStats?.() || stats;

      // Datos para gráficos de rendimiento
      const systemData = Object.entries(educationalStats.systems || {}).map(([name, systemStats]) => ({
        name,
        time: systemStats.lastExecutionTime || 0,
        queries: educationalStats.queryOptimizer?.queryDetails?.[name]?.entitiesFound || 0
      }));

      setPerformanceData(systemData);
      setArchetypeInfo(educationalStats.archetypes || {});
      setQueryStats(educationalStats.queryOptimizer || {});

      // Obtener métricas de almacenamiento SoA
      if (world.storageManager) {
        const storageStats = world.storageManager.getStats();
        setStorageMetrics(storageStats);
      }

      // Obtener estadísticas del scheduler
      if (world.scheduler) {
        const schedulerStats = world.scheduler.getStats();
        setSchedulerStats(schedulerStats);
      }

      // Simular datos de cache para visualización
      if (world.queryOptimizer) {
        const cacheData = generateCacheVisualization(educationalStats);
        setCacheVisualization(cacheData);
      }
    };

    const interval = setInterval(updatePerformanceData, 1000);
    return () => clearInterval(interval);
  }, [world, stats]);

  const generateCacheVisualization = (educationalStats) => {
    const visualization = [];
    const totalEntities = educationalStats.entities || 0;

    // Simular líneas de cache
    for (let i = 0; i < Math.min(totalEntities, 20); i++) {
      visualization.push({
        entityId: i + 1,
        inCache: Math.random() > 0.3,
        accessPattern: Math.random() > 0.5 ? 'sequential' : 'random',
        components: ['Transform', 'Velocity', 'RenderMesh'].filter(() => Math.random() > 0.3)
      });
    }

    return visualization;
  };

  return (
    <div className="bg-gray-700 p-4 rounded">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-ecs-blue">🔍 Rendimiento y Optimización</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowCacheLupa(!showCacheLupa)}
            className="px-3 py-1 bg-ecs-purple hover:bg-purple-600 rounded text-sm"
          >
            {showCacheLupa ? 'Ocultar' : 'Mostrar'} Lupa de Memoria
          </button>
          <button
            onClick={() => setShowQueryInspector(true)}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-sm"
          >
            🔍 Query Inspector
          </button>
          <button
            onClick={() => setShowDeltaTimeOscilloscope(true)}
            className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm"
          >
            📊 Osciloscopio Δt
          </button>
          <button
            onClick={() => setShowEventTimeline(true)}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-sm"
          >
            🎬 Event Timeline
          </button>
          <button
            onClick={() => world.togglePauseScheduler()}
            className={`px-3 py-1 rounded text-sm ${
              world.scheduler?.isPaused ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-blue-600 hover:bg-blue-500'
            }`}
          >
            {world.scheduler?.isPaused ? '▶️ Reanudar' : '⏸️ Pausar'}
          </button>
          {world.scheduler?.isPaused && (
            <button
              onClick={() => world.stepScheduler()}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-500 rounded text-sm"
            >
              ⏯️ Step
            </button>
          )}
        </div>
      </div>

      {/* Información de Arquetipos */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-green-400">🏗️ Arquetipos ({Object.keys(archetypeInfo).length})</h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {Object.entries(archetypeInfo).map(([signature, data]) => (
            <div key={signature} className="text-xs bg-slate-800 p-2 rounded">
              <div className="flex justify-between">
                <span className="font-mono text-purple-400">{signature || 'sin componentes'}</span>
                <span className="text-green-400">{data.entityCount} entidades</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estadísticas de Queries */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-cyan-400">🔍 Queries</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800 p-2 rounded">
            <div className="text-slate-400">Queries activas</div>
            <div className="text-lg font-bold text-cyan-400">{queryStats.totalQueries || 0}</div>
          </div>
          <div className="bg-slate-800 p-2 rounded">
            <div className="text-slate-400">Tiempo total</div>
            <div className="text-lg font-bold text-green-400">{(queryStats.totalExecutionTime || 0).toFixed(2)}ms</div>
          </div>
        </div>
      </div>

      {/* Métricas de Entidades Generacionales */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-blue-400">🏗️ Entidades Generacionales</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800 p-3 rounded text-center">
            <div className="text-lg font-bold text-cyan-400">{world.entityManager?.getStats().aliveEntities || 0}</div>
            <div className="text-xs text-slate-400">Entidades Vivas</div>
          </div>
          <div className="bg-slate-800 p-3 rounded text-center">
            <div className="text-lg font-bold text-green-400">{world.entityManager?.getStats().reused || 0}</div>
            <div className="text-xs text-slate-400">Slots Reutilizados</div>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Load Factor</span>
            <span className="text-slate-400">{(world.entityManager?.getStats().loadFactor || 0).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                world.entityManager?.getStats().isOverloaded ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(world.entityManager?.getStats().loadFactor || 0, 100)}%` }}
            ></div>
          </div>
          {world.entityManager?.getStats().isOverloaded && (
            <div className="text-xs text-red-400 mt-1">⚠️ Load factor &gt; 80%</div>
          )}
        </div>
      </div>

      {/* Métricas de Almacenamiento SoA */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-yellow-400">💾 Almacenamiento SoA</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {Object.entries(storageMetrics.storages || {}).map(([componentName, stats]) => (
            <div key={componentName} className="bg-slate-800 p-2 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-mono text-purple-400">{componentName}</span>
                <span className="text-xs text-slate-400">
                  {stats.size}/{stats.capacity} ({stats.loadFactor?.toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    stats.isOverloaded ? 'bg-red-500' : stats.loadFactor > 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(stats.loadFactor || 0, 100)}%` }}
                ></div>
              </div>
              {stats.isOverloaded && (
                <div className="text-xs text-red-400 mt-1">⚠️ Load factor &gt; 80%</div>
              )}
            </div>
          ))}
        </div>
        {storageMetrics.overloadedStorages?.length > 0 && (
          <div className="text-xs text-red-400 mt-2">
            ⚠️ Almacenamientos sobrecargados: {storageMetrics.overloadedStorages.join(', ')}
          </div>
        )}
      </div>

      {/* Gráfico de barras de rendimiento por sistema */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Tiempo por Sistema (ms)</h4>
        <div className="space-y-2">
          {performanceData.map((system) => (
            <div key={system.name} className="flex items-center">
              <span className="w-20 text-sm">{system.name}</span>
              <div className="flex-1 bg-gray-600 rounded h-4 ml-2">
                <div
                  className="bg-ecs-green h-4 rounded transition-all duration-300"
                  style={{
                    width: `${Math.min((system.time / 16.67) * 100, 100)}%`
                  }}
                />
              </div>
              <span className="ml-2 text-xs text-gray-400">
                {system.time.toFixed(2)}ms
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Estadísticas de queries */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Estadísticas de Queries</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-600 p-2 rounded">
            <div className="text-gray-400">Queries activas</div>
            <div className="text-lg font-bold">{stats.queries || 0}</div>
          </div>
          <div className="bg-gray-600 p-2 rounded">
            <div className="text-gray-400">Entidades procesadas</div>
            <div className="text-lg font-bold">{stats.totalComponents || 0}</div>
          </div>
        </div>
      </div>

      {/* Lupa de Memoria Didáctica */}
      {showCacheLupa && (
        <div className="mt-6">
          <h4 className="font-semibold mb-3 text-ecs-purple">🔎 Lupa de Memoria Didáctica</h4>

          <div className="bg-black/30 p-3 rounded text-xs">
            <div className="mb-2 text-gray-400">
              Visualización del acceso a memoria (simulado):
            </div>

            {/* Leyenda */}
            <div className="flex gap-4 mb-3 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                <span>En cache (rápido)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                <span>Miss de cache (lento)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                <span>Acceso secuencial</span>
              </div>
            </div>

            {/* Contador de entidades */}
            <div className="text-xs text-gray-400 mb-2">
              {cacheVisualization.length} entidades simuladas en memoria
            </div>

            {/* Visualización de entidades en memoria */}
            <div className="grid grid-cols-10 gap-1">
              {cacheVisualization.map((entity) => (
                <div
                  key={entity.entityId}
                  className={`h-6 rounded flex items-center justify-center text-xs font-mono cursor-pointer transition-all ${
                    entity.inCache
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                  } ${
                    entity.accessPattern === 'sequential' ? 'ring-2 ring-blue-500' : ''
                  }`}
                  title={`Entidad ${entity.entityId} - Componentes: ${entity.components.join(', ')}`}
                >
                  {entity.entityId}
                </div>
              ))}
            </div>

            {/* Explicación didáctica */}
            <div className="mt-3 p-2 bg-blue-900/30 rounded">
              <div className="text-xs text-blue-200 mb-1">💡 ¿Por qué importa el cache?</div>
              <div className="text-xs text-gray-300">
                El procesador es mucho más rápido que la memoria RAM. Los datos en cache se acceden
                ~100x más rápido. El diseño orientado a datos agrupa componentes similares para
                maximizar los hits de cache y minimizar los costosos misses.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas del Scheduler */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2 text-purple-400">⏰ Scheduler</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-800 p-2 rounded">
            <div className="text-slate-400">Estado</div>
            <div className={`font-bold ${world.scheduler?.isPaused ? 'text-red-400' : 'text-green-400'}`}>
              {world.scheduler?.isPaused ? '⏸️ Pausado' : '▶️ Activo'}
            </div>
          </div>
          <div className="bg-slate-800 p-2 rounded">
            <div className="text-slate-400">Fixed Timestep</div>
            <div className="text-lg font-bold text-blue-400">
              {((schedulerStats.fixedTimeStep || 0) * 1000).toFixed(1)}ms
            </div>
          </div>
        </div>
      </div>

      {/* Consejos de optimización */}
      <div className="mt-4 p-2 bg-yellow-900/20 rounded">
        <div className="text-xs text-yellow-200 mb-1">⚡ Consejos de Optimización</div>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• Los arquetipos agrupan entidades con componentes similares</li>
          <li>• Iterar sobre arrays densos es más rápido que saltar en memoria</li>
          <li>• Minimizar cambios de componentes para mantener arquetipos estables</li>
          <li>• El scheduler maneja fixed timestep automáticamente</li>
          <li>• Usa pausa/step para debugging determinista</li>
        </ul>
      </div>

      {/* Modals */}
      {showQueryInspector && (
        <QueryInspector
          world={world}
          onClose={() => setShowQueryInspector(false)}
        />
      )}

      {showDeltaTimeOscilloscope && world.scheduler && (
        <DeltaTimeOscilloscope
          scheduler={world.scheduler}
          onClose={() => setShowDeltaTimeOscilloscope(false)}
        />
      )}

      {showEventTimeline && world.eventBus && (
        <EventTimeline
          eventBus={world.eventBus}
          onClose={() => setShowEventTimeline(false)}
        />
      )}
    </div>
  );
}
