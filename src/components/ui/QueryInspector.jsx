import { useState, useEffect } from 'react';

export default function QueryInspector({ world, onClose }) {
  const [queries, setQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState([]);

  // Actualizar métricas de queries
  useEffect(() => {
    if (!world) return;

    const updateQueryMetrics = () => {
      const metrics = {};
      let totalTime = 0;
      let totalEntities = 0;

      // Recopilar métricas de cada query activa
      const queryList = Array.from(world.queries.entries()).map(([queryId, entities]) => {
        const executionTime = Math.random() * 2 + 0.1; // Simulado
        const entityCount = entities.size;

        metrics[queryId] = {
          executionTime,
          entityCount,
          efficiency: entityCount / executionTime
        };

        totalTime += executionTime;
        totalEntities += entityCount;

        return {
          id: queryId,
          signature: `Query_${queryId}`,
          entities: Array.from(entities),
          executionTime,
          entityCount,
          efficiency: entityCount / executionTime
        };
      });

      setQueries(queryList);
      setPerformanceMetrics({
        totalQueries: queryList.length,
        totalExecutionTime: totalTime,
        totalEntitiesProcessed: totalEntities,
        averageTimePerQuery: totalTime / Math.max(queryList.length, 1)
      });
    };

    updateQueryMetrics();
    const interval = setInterval(updateQueryMetrics, 500);

    return () => clearInterval(interval);
  }, [world]);

  // Sistema de grabación
  useEffect(() => {
    if (!isRecording) return;

    const recordFrame = () => {
      const frameData = {
        timestamp: Date.now(),
        queries: queries.map(q => ({
          id: q.id,
          entityCount: q.entityCount,
          executionTime: q.executionTime
        }))
      };

      setRecording(prev => [...prev, frameData]);
    };

    const interval = setInterval(recordFrame, 100);
    return () => clearInterval(interval);
  }, [isRecording, queries]);



  const getLoadFactorColor = (loadFactor) => {
    if (loadFactor > 80) return 'bg-red-500';
    if (loadFactor > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTimeColor = (time) => {
    if (time > 1.0) return 'text-red-400';
    if (time > 0.5) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-800 p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">🔍 Query Inspector</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`px-3 py-1 rounded ${isRecording ? 'bg-red-600' : 'bg-green-600'} hover:opacity-80`}
            >
              {isRecording ? '⏹️ Stop' : '⏺️ Record'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Métricas Globales */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-700 p-4 rounded">
            <div className="text-2xl font-bold text-cyan-400">{performanceMetrics.totalQueries}</div>
            <div className="text-sm text-slate-400">Queries Activas</div>
          </div>
          <div className="bg-slate-700 p-4 rounded">
            <div className="text-2xl font-bold text-green-400">{performanceMetrics.totalExecutionTime?.toFixed(2)}ms</div>
            <div className="text-sm text-slate-400">Tiempo Total</div>
          </div>
          <div className="bg-slate-700 p-4 rounded">
            <div className="text-2xl font-bold text-purple-400">{performanceMetrics.totalEntitiesProcessed}</div>
            <div className="text-sm text-slate-400">Entidades Procesadas</div>
          </div>
          <div className="bg-slate-700 p-4 rounded">
            <div className="text-2xl font-bold text-yellow-400">{performanceMetrics.averageTimePerQuery?.toFixed(2)}ms</div>
            <div className="text-sm text-slate-400">Tiempo Promedio</div>
          </div>
        </div>

        {/* Lista de Queries */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-green-400">📊 Queries Activas</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {queries.map(query => (
              <div
                key={query.id}
                className={`p-3 rounded cursor-pointer transition-all ${
                  selectedQuery === query.id
                    ? 'bg-cyan-900/50 border border-cyan-400'
                    : 'bg-slate-700/50 hover:bg-slate-600/50'
                }`}
                onClick={() => setSelectedQuery(selectedQuery === query.id ? null : query.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-mono text-sm text-purple-400">Query_{query.id}</span>
                    <span className="text-xs text-slate-400 ml-2">({query.entities.length} entidades)</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm ${getTimeColor(query.executionTime)}`}>
                      {query.executionTime.toFixed(2)}ms
                    </span>
                    <div className="w-16 bg-slate-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getLoadFactorColor(query.entityCount / 100 * 100)}`}
                        style={{ width: `${Math.min((query.entityCount / 1000) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {selectedQuery === query.id && (
                  <div className="mt-3 p-3 bg-slate-800 rounded">
                    <div className="text-xs text-slate-400 mb-2">Entidades en esta query:</div>
                    <div className="grid grid-cols-8 gap-1 text-xs font-mono">
                      {query.entities.slice(0, 24).map(entityId => (
                        <span key={entityId} className="bg-slate-600 px-2 py-1 rounded">
                          {entityId}
                        </span>
                      ))}
                      {query.entities.length > 24 && (
                        <span className="bg-slate-600 px-2 py-1 rounded text-slate-500">
                          +{query.entities.length - 24} más
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sistema de Grabación */}
        {isRecording && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-red-400">🎥 Grabando... ({recording.length} frames)</h3>
            <div className="bg-slate-700 p-4 rounded">
              <div className="text-sm text-slate-400 mb-2">
                Timeline de ejecución - Últimos 10 frames:
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {recording.slice(-10).map((frame, index) => (
                  <div key={index} className="text-xs font-mono">
                    <span className="text-slate-500">Frame {recording.length - 10 + index}:</span>
                    <span className="ml-2">
                      {frame.queries.map(q => `${q.id}(${q.entityCount})`).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Consejos de Optimización */}
        <div className="bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 Consejos de Optimización</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• Queries con tiempo &gt; 1ms necesitan optimización</li>
            <li>• Más de 1000 entidades por query indica queries demasiado amplias</li>
            <li>• Cachea resultados de queries que no cambian frecuentemente</li>
            <li>• Considera dividir queries complejas en queries más específicas</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
