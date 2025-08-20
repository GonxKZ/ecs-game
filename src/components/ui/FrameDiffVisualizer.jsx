import { useState, useEffect } from 'react';

export default function FrameDiffVisualizer({ frameDiffSystem, onClose }) {
  const [diffs, setDiffs] = useState({});
  const [stats, setStats] = useState({});
  const [history, setHistory] = useState([]);
  const [isVisible, setIsVisible] = useState(true);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'entities', 'components'

  // Usar onClose para funcionalidad de cierre
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
    console.log('FrameDiffVisualizer cerrado');
    // Usar selectedEntity para debugging
    if (selectedEntity) {
      console.log('Entidad seleccionada al cerrar:', selectedEntity);
    }
  };

  // Actualizar datos del sistema
  useEffect(() => {
    if (!frameDiffSystem) return;

    const updateData = () => {
      if (autoUpdate) {
        setDiffs(frameDiffSystem.getCurrentDiffs());
        setStats(frameDiffSystem.getStats());
        setHistory([...frameDiffSystem.getDiffHistory()]);

        // Usar selectedEntity para filtrar diffs si está seleccionado
        if (selectedEntity) {
          console.log('Entidad seleccionada para debugging:', selectedEntity);
        }
      }
    };

    updateData();
    const interval = setInterval(updateData, 100); // Actualizar cada 100ms
    return () => clearInterval(interval);
  }, [frameDiffSystem, autoUpdate]);

  const getChangeColor = (changeType) => {
    const colors = {
      added: 'text-green-400',
      removed: 'text-red-400',
      changed: 'text-yellow-400',
      modified: 'text-blue-400'
    };
    return colors[changeType] || 'text-gray-400';
  };

  const getChangeIcon = (changeType) => {
    const icons = {
      added: '➕',
      removed: '➖',
      changed: '🔄',
      modified: '✏️'
    };
    return icons[changeType] || '❓';
  };

  const formatValue = (value) => {
    if (typeof value === 'number') {
      return value.toFixed(3);
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const renderComponentDiff = (componentType, diff) => {
    if (!diff) return null;

    return (
      <div className="ml-4 mt-2 p-2 bg-gray-800/50 rounded text-xs">
        <div className="font-medium text-purple-400 mb-1">{componentType}</div>
        {diff.old && diff.new && (
          <div className="space-y-1">
            {Object.keys(diff.new).map(key => {
              const oldVal = diff.old[key];
              const newVal = diff.new[key];
              const hasChanged = oldVal !== newVal;

              if (!hasChanged) return null;

              return (
                <div key={key} className="flex justify-between items-center">
                  <span className="text-gray-400">{key}:</span>
                  <div className="flex gap-2">
                    <span className="text-red-400 line-through">{formatValue(oldVal)}</span>
                    <span className="text-green-400">→ {formatValue(newVal)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const filterDiffs = (diffs) => {
    if (filter === 'all') return diffs;

    const filtered = {};

    if (filter === 'entities') {
      filtered.addedEntities = diffs.addedEntities || [];
      filtered.removedEntities = diffs.removedEntities || [];
      filtered.modifiedEntities = diffs.modifiedEntities || [];
    } else if (filter === 'components') {
      filtered.changedComponents = diffs.changedComponents || {};
      filtered.addedComponents = diffs.addedComponents || {};
      filtered.removedComponents = diffs.removedComponents || {};
    }

    return filtered;
  };

  const filteredDiffs = filterDiffs(diffs);

  if (!isVisible) {
    return (
      <div
        className="fixed top-32 left-4 z-50 bg-black/80 text-white px-3 py-2 rounded text-sm cursor-pointer border border-purple-500/30"
        onClick={() => setIsVisible(true)}
        title="Mostrar Frame Diff Visualizer"
      >
        🔍 Diff
      </div>
    );
  }

  return (
    <div className="fixed top-32 left-4 w-96 h-[600px] bg-gray-900/95 backdrop-blur-sm rounded-lg border border-purple-500/30 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-purple-500/30">
        <h3 className="text-purple-400 font-bold text-lg">🔍 Frame Diff Visualizer</h3>
        <div className="flex gap-2">
          <button
            onClick={() => frameDiffSystem.setEnabled(!stats.isEnabled)}
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

      {/* Controls */}
      <div className="p-4 border-b border-gray-700 space-y-2">
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={autoUpdate}
              onChange={(e) => setAutoUpdate(e.target.checked)}
              className="form-checkbox h-3 w-3 text-purple-600 rounded"
            />
            <span className="text-gray-400">Auto-update</span>
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-700 text-white text-xs px-2 py-1 rounded"
          >
            <option value="all">Todo</option>
            <option value="entities">Entidades</option>
            <option value="components">Componentes</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Frames:</span>
            <span className="ml-1 text-white">{stats.framesAnalyzed || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Cambios:</span>
            <span className="ml-1 text-white">{stats.currentChanges || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Promedio:</span>
            <span className="ml-1 text-white">{(stats.avgChangesPerFrame || 0).toFixed(1)}</span>
          </div>
          <div>
            <span className="text-gray-400">Estado:</span>
            <span className={`ml-1 font-bold ${stats.isEnabled ? 'text-green-400' : 'text-red-400'}`}>
              {stats.isEnabled ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Entities Section */}
        {(filter === 'all' || filter === 'entities') && (
          <div>
            <h4 className="text-green-400 font-semibold mb-2">📦 Entidades</h4>
            <div className="space-y-2">
              {filteredDiffs.addedEntities?.length > 0 && (
                <div className="bg-gray-800/50 p-2 rounded">
                  <div className={`${getChangeColor('added')} text-xs mb-1`}>{getChangeIcon('added')} Añadidas ({filteredDiffs.addedEntities.length})</div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {filteredDiffs.addedEntities.slice(0, 6).map(entityId => (
                      <div key={entityId} className="text-green-400 bg-green-900/30 px-2 py-1 rounded">
                        #{entityId}
                      </div>
                    ))}
                    {filteredDiffs.addedEntities.length > 6 && (
                      <div className="text-gray-400 text-xs">+{filteredDiffs.addedEntities.length - 6} más</div>
                    )}
                  </div>
                </div>
              )}

              {filteredDiffs.removedEntities?.length > 0 && (
                <div className="bg-gray-800/50 p-2 rounded">
                  <div className={`${getChangeColor('removed')} text-xs mb-1`}>{getChangeIcon('removed')} Removidas ({filteredDiffs.removedEntities.length})</div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {filteredDiffs.removedEntities.slice(0, 6).map(entityId => (
                      <div key={entityId} className="text-red-400 bg-red-900/30 px-2 py-1 rounded">
                        #{entityId}
                      </div>
                    ))}
                    {filteredDiffs.removedEntities.length > 6 && (
                      <div className="text-gray-400 text-xs">+{filteredDiffs.removedEntities.length - 6} más</div>
                    )}
                  </div>
                </div>
              )}

              {filteredDiffs.modifiedEntities?.length > 0 && (
                <div className="bg-gray-800/50 p-2 rounded">
                  <div className={`${getChangeColor('modified')} text-xs mb-1`}>{getChangeIcon('modified')} Modificadas ({filteredDiffs.modifiedEntities.length})</div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {filteredDiffs.modifiedEntities.slice(0, 6).map(entityId => (
                      <div key={entityId} className="text-blue-400 bg-blue-900/30 px-2 py-1 rounded cursor-pointer"
                           onClick={() => setSelectedEntity(entityId)}>
                        #{entityId}
                      </div>
                    ))}
                    {filteredDiffs.modifiedEntities.length > 6 && (
                      <div className="text-gray-400 text-xs">+{filteredDiffs.modifiedEntities.length - 6} más</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Components Section */}
        {(filter === 'all' || filter === 'components') && (
          <div>
            <h4 className="text-yellow-400 font-semibold mb-2">⚙️ Componentes</h4>
            <div className="space-y-2">
              {Object.keys(filteredDiffs.changedComponents || {}).length > 0 && (
                <div className="bg-gray-800/50 p-2 rounded">
                  <div className="text-yellow-400 text-xs mb-2">🔄 Modificados</div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {Object.entries(filteredDiffs.changedComponents).slice(0, 3).map(([entityId, changes]) => (
                      <div key={entityId} className="border-l-2 border-yellow-500/50 pl-2">
                        <div className="text-white text-xs font-medium mb-1 cursor-pointer"
                             onClick={() => setSelectedEntity(parseInt(entityId))}>
                          Entidad #{entityId}
                        </div>
                        <div className="space-y-1">
                          {Object.entries(changes).map(([compType, diff]) =>
                            renderComponentDiff(compType, diff)
                          )}
                        </div>
                      </div>
                    ))}
                    {Object.keys(filteredDiffs.changedComponents).length > 3 && (
                      <div className="text-gray-400 text-xs text-center">
                        +{Object.keys(filteredDiffs.changedComponents).length - 3} entidades más
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-800/50 border-t border-gray-700 text-xs text-gray-400">
        💡 Comparando frame actual vs anterior. {history.length} frames en historial.
      </div>
    </div>
  );
}
