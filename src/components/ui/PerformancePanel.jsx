import { useState, useEffect } from 'react';

export default function PerformancePanel({ world, stats }) {
  const [performanceData, setPerformanceData] = useState([]);
  const [cacheVisualization, setCacheVisualization] = useState([]);
  const [showCacheLupa, setShowCacheLupa] = useState(false);
  const [archetypeInfo, setArchetypeInfo] = useState({});
  const [queryStats, setQueryStats] = useState({});

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
        <div className="flex gap-2">
          <button
            onClick={() => setShowCacheLupa(!showCacheLupa)}
            className="px-3 py-1 bg-ecs-purple hover:bg-purple-600 rounded text-sm"
          >
            {showCacheLupa ? 'Ocultar' : 'Mostrar'} Lupa de Memoria
          </button>
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

      {/* Consejos de optimización */}
      <div className="mt-4 p-2 bg-yellow-900/20 rounded">
        <div className="text-xs text-yellow-200 mb-1">⚡ Consejos de Optimización</div>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• Los arquetipos agrupan entidades con componentes similares</li>
          <li>• Iterar sobre arrays densos es más rápido que saltar en memoria</li>
          <li>• Minimizar cambios de componentes para mantener arquetipos estables</li>
          <li>• El optimizador de queries encuentra el componente más restrictivo primero</li>
        </ul>
      </div>
    </div>
  );
}
