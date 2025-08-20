import { useState } from 'react';

export default function PersistencePanel({ world, onAddConsoleMessage }) {
  const [prefabName, setPrefabName] = useState('');
  const [selectedEntityForPrefab, setSelectedEntityForPrefab] = useState(null);
  const [prefabs, setPrefabs] = useState([]);
  const [worldData, setWorldData] = useState('');

  // Obtener entidades disponibles
  const getEntities = () => {
    if (!world) return [];
    return Array.from(world.entities.entries()).map(([id, components]) => ({
      id,
      componentCount: components.size,
      components: Array.from(components)
    }));
  };

  const entities = getEntities();

  // Actualizar lista de prefabs
  const refreshPrefabs = () => {
    if (world?.persistenceManager) {
      const prefabList = world.persistenceManager.listPrefabs();
      setPrefabs(prefabList);
    }
  };

  // Crear prefab
  const handleCreatePrefab = () => {
    if (!selectedEntityForPrefab || !prefabName.trim()) {
      onAddConsoleMessage('❌ Selecciona una entidad y proporciona un nombre para el prefab');
      return;
    }

    if (world?.persistenceManager) {
      const prefab = world.persistenceManager.createPrefab(selectedEntityForPrefab, prefabName.trim());
      if (prefab) {
        onAddConsoleMessage(`🏗️ Prefab creado: ${prefabName} (${Object.keys(prefab.components).length} componentes)`);
        setPrefabName('');
        setSelectedEntityForPrefab(null);
        refreshPrefabs();
      }
    }
  };

  // Instanciar prefab
  const handleInstantiatePrefab = (prefabName) => {
    if (world?.persistenceManager) {
      const entityId = world.persistenceManager.instantiatePrefab(prefabName, {
        x: Math.random() * 4 - 2,
        y: Math.random() * 2 + 1,
        z: Math.random() * 4 - 2
      });

      if (entityId) {
        onAddConsoleMessage(`🎭 Prefab instanciado: ${prefabName} (Entidad ${entityId})`);
      }
    }
  };

  // Guardar mundo
  const handleSaveWorld = () => {
    if (world?.persistenceManager) {
      const data = world.persistenceManager.saveWorld();
      setWorldData(data);
      onAddConsoleMessage(`💾 Mundo guardado: ${data.length} caracteres de datos`);
    }
  };

  // Cargar mundo
  const handleLoadWorld = () => {
    if (world?.persistenceManager && worldData.trim()) {
      const success = world.persistenceManager.loadWorld(worldData);
      if (success) {
        onAddConsoleMessage('📂 Mundo cargado exitosamente');
      } else {
        onAddConsoleMessage('❌ Error al cargar el mundo');
      }
    }
  };

  // Exportar entidad
  const handleExportEntity = (entityId) => {
    if (world?.persistenceManager) {
      const data = world.persistenceManager.exportEntity(entityId);
      if (data) {
        navigator.clipboard.writeText(data);
        onAddConsoleMessage(`📤 Entidad ${entityId} copiada al portapapeles`);
      }
    }
  };

  // Importar entidad
  const handleImportEntity = () => {
    const jsonData = prompt('Pega los datos JSON de la entidad:');
    if (jsonData && world?.persistenceManager) {
      const entityId = world.persistenceManager.importEntity(jsonData);
      if (entityId) {
        onAddConsoleMessage(`📥 Entidad importada: ${entityId}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Crear Prefabs */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="font-bold text-lg text-purple-400 mb-4">🏗️ Crear Prefabs</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Seleccionar Entidad:</label>
            <select
              value={selectedEntityForPrefab || ''}
              onChange={(e) => setSelectedEntityForPrefab(parseInt(e.target.value) || null)}
              className="w-full bg-slate-700 p-2 rounded"
            >
              <option value="">Elegir entidad...</option>
              {entities.map(entity => (
                <option key={entity.id} value={entity.id}>
                  Entidad #{entity.id} ({entity.componentCount} componentes)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Nombre del Prefab:</label>
            <input
              type="text"
              value={prefabName}
              onChange={(e) => setPrefabName(e.target.value)}
              placeholder="Ej: EnemigoTipo1"
              className="w-full bg-slate-700 p-2 rounded"
            />
          </div>

          <button
            onClick={handleCreatePrefab}
            disabled={!selectedEntityForPrefab || !prefabName.trim()}
            className="w-full btn btn-primary"
          >
            🏗️ Crear Prefab
          </button>
        </div>
      </div>

      {/* Lista de Prefabs */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="font-bold text-lg text-cyan-400 mb-4">📦 Prefabs Disponibles</h3>

        <div className="space-y-2 max-h-40 overflow-y-auto">
          {prefabs.length === 0 ? (
            <p className="text-slate-400 text-sm">No hay prefabs creados</p>
          ) : (
            prefabs.map(prefab => (
              <div key={prefab.name} className="flex justify-between items-center bg-slate-700/50 p-2 rounded">
                <div>
                  <span className="font-semibold text-white">{prefab.name}</span>
                  <span className="text-xs text-slate-400 ml-2">({prefab.componentCount} componentes)</span>
                </div>
                <button
                  onClick={() => handleInstantiatePrefab(prefab.name)}
                  className="btn btn-secondary btn-sm"
                >
                  🎭 Instanciar
                </button>
              </div>
            ))
          )}
        </div>

        <button
          onClick={refreshPrefabs}
          className="w-full mt-3 btn btn-secondary"
        >
          🔄 Actualizar Lista
        </button>
      </div>

      {/* Guardar/Cargar Mundo */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="font-bold text-lg text-green-400 mb-4">💾 Persistencia del Mundo</h3>

        <div className="space-y-3">
          <button
            onClick={handleSaveWorld}
            className="w-full btn btn-success"
          >
            💾 Guardar Mundo
          </button>

          <textarea
            value={worldData}
            onChange={(e) => setWorldData(e.target.value)}
            placeholder="Los datos guardados aparecerán aquí..."
            className="w-full h-24 bg-slate-700 p-2 rounded text-xs font-mono resize-none"
          />

          <button
            onClick={handleLoadWorld}
            disabled={!worldData.trim()}
            className="w-full btn btn-warning"
          >
            📂 Cargar Mundo
          </button>
        </div>
      </div>

      {/* Exportar/Importar Entidades */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <h3 className="font-bold text-lg text-yellow-400 mb-4">📤 Exportar/Importar Entidades</h3>

        <div className="space-y-3">
          <div>
            <p className="text-sm text-slate-400 mb-2">Exportar entidad:</p>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleExportEntity(parseInt(e.target.value));
                  e.target.value = '';
                }
              }}
              className="w-full bg-slate-700 p-2 rounded"
            >
              <option value="">Elegir entidad para exportar...</option>
              {entities.map(entity => (
                <option key={entity.id} value={entity.id}>
                  Entidad #{entity.id} ({entity.componentCount} componentes)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleImportEntity}
            className="w-full btn btn-secondary"
          >
            📥 Importar Entidad
          </button>
        </div>
      </div>

      {/* Consejos Educativos */}
      <div className="bg-blue-900/20 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 ¿Por qué es importante la persistencia?</h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          La persistencia te permite salvar el estado de tu juego, crear assets reutilizables, y construir
          sistemas modulares. Los prefabs son especialmente útiles para crear enemigos, items, o cualquier
          entidad que se repita muchas veces.
        </p>
      </div>
    </div>
  );
}
