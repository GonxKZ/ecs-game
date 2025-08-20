import { useState, useEffect } from 'react';

export default function PrefabPanel({ world, prefabSystem, onClose }) {
  const [prefabs, setPrefabs] = useState([]);
  const [selectedPrefab, setSelectedPrefab] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [newPrefabName, setNewPrefabName] = useState('');
  const [newPrefabDescription, setNewPrefabDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateFromEntity, setShowCreateFromEntity] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [importJson, setImportJson] = useState('');

  // Entidades disponibles para crear prefabs
  const [availableEntities, setAvailableEntities] = useState([]);

  // Actualizar lista de prefabs
  useEffect(() => {
    if (!prefabSystem) return;

    const updatePrefabs = () => {
      const prefabList = prefabSystem.getPrefabList();
      setPrefabs(prefabList);
    };

    updatePrefabs();

    // Actualizar cada segundo para reflejar cambios
    const interval = setInterval(updatePrefabs, 1000);
    return () => clearInterval(interval);
  }, [prefabSystem]);

  // Actualizar lista de entidades
  useEffect(() => {
    const updateEntities = () => {
      const entityList = [];
      for (const [entityId] of world.entities) {
        const components = world.getEntityComponents(entityId);
        entityList.push({
          id: entityId,
          name: `Entidad ${entityId}`,
          componentCount: components.length,
          components: components
        });
      }
      setAvailableEntities(entityList);
    };

    updateEntities();
    const interval = setInterval(updateEntities, 100);
    return () => clearInterval(interval);
  }, [world]);

  // Filtrar prefabs
  const filteredPrefabs = prefabs.filter(prefab =>
    searchTerm === '' ||
    prefab.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prefab.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreatePrefabFromEntity = () => {
    if (!selectedEntity || !newPrefabName.trim()) return;

    try {
      const prefabId = prefabSystem.createPrefabFromEntity(
        selectedEntity.id,
        newPrefabName.trim(),
        newPrefabDescription.trim()
      );

      // Usar prefabId para logging
      console.log(`Prefab creado con ID: ${prefabId}`);

      console.log(`🏗️ Prefab creado desde entidad ${selectedEntity.id}: ${newPrefabName}`);

      // Reset form
      setNewPrefabName('');
      setNewPrefabDescription('');
      setSelectedEntity(null);
      setShowCreateFromEntity(false);

    } catch (error) {
      console.error('Error creando prefab:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleInstantiatePrefab = (prefabId) => {
    try {
      const entityId = prefabSystem.instantiatePrefab(prefabId);
      console.log(`📦 Prefab instanciado como entidad ${entityId}`);
    } catch (error) {
      console.error('Error instanciando prefab:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeletePrefab = (prefabId) => {
    const prefab = prefabs.find(p => p.id === prefabId);
    if (!prefab) return;

    if (window.confirm(`¿Eliminar prefab "${prefab.name}"?\nEsto también eliminará todas sus instancias.`)) {
      const success = prefabSystem.deletePrefab(prefabId);
      if (success) {
        if (selectedPrefab?.id === prefabId) {
          setSelectedPrefab(null);
        }
        console.log(`🗑️ Prefab "${prefab.name}" eliminado`);
      }
    }
  };

  const handleDuplicatePrefab = (prefabId) => {
    const prefab = prefabs.find(p => p.id === prefabId);
    if (!prefab) return;

    const newName = `${prefab.name} (Copia)`;
    try {
      const newPrefabId = prefabSystem.duplicatePrefab(prefabId, newName);
      console.log(`📋 Prefab duplicado: ${newName} (ID: ${newPrefabId})`);
    } catch (error) {
      console.error('Error duplicando prefab:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleExportPrefab = (prefabId) => {
    try {
      const jsonString = prefabSystem.exportPrefab(prefabId);
      if (jsonString) {
        // Descargar archivo
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const prefab = prefabs.find(p => p.id === prefabId);
        a.href = url;
        a.download = `${prefab?.name || 'prefab'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`📤 Prefab "${prefab?.name}" exportado`);
      }
    } catch (error) {
      console.error('Error exportando prefab:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleImportPrefab = () => {
    try {
      const prefabId = prefabSystem.importPrefab(importJson);
      if (prefabId) {
        setImportJson('');
        setShowImportExport(false);
        console.log(`📥 Prefab importado exitosamente`);
      } else {
        alert('Error: No se pudo importar el prefab. Verifica el formato JSON.');
      }
    } catch (error) {
      console.error('Error importando prefab:', error);
      alert(`Error de formato JSON: ${error.message}`);
    }
  };

  const handleCreateEducationalPrefabs = () => {
    if (prefabSystem) {
      prefabSystem.createEducationalPrefabs();
      console.log('🎓 Prefabs educativos creados');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-800 p-6 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">🏗️ Prefab Manager</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportExport(!showImportExport)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-sm"
            >
              📤 Import/Export
            </button>
            <button
              onClick={() => setShowCreateFromEntity(!showCreateFromEntity)}
              className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm"
            >
              ➕ Crear Prefab
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de Prefabs */}
          <div className="space-y-4">
            <div className="bg-slate-700 p-4 rounded">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-green-400">
                  📦 Prefabs ({filteredPrefabs.length})
                </h3>
                <button
                  onClick={handleCreateEducationalPrefabs}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs"
                >
                  🎓 Crear Educativos
                </button>
              </div>

              {/* Buscador */}
              <input
                type="text"
                placeholder="Buscar prefabs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm mb-3"
              />

              {/* Lista de prefabs */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPrefabs.map(prefab => (
                  <div
                    key={prefab.id}
                    onClick={() => setSelectedPrefab(prefab)}
                    className={`p-3 rounded cursor-pointer transition-colors ${
                      selectedPrefab?.id === prefab.id
                        ? 'bg-blue-600 border border-blue-400'
                        : 'bg-slate-600 hover:bg-slate-500'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{prefab.name}</div>
                        <div className="text-xs text-slate-400">{prefab.description}</div>
                        <div className="text-xs text-purple-400">
                          {prefab.componentCount} componentes, {prefab.instanceCount} instancias
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInstantiatePrefab(prefab.id);
                          }}
                          className="text-green-400 hover:text-green-300 text-sm"
                          title="Instanciar"
                        >
                          📦
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicatePrefab(prefab.id);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                          title="Duplicar"
                        >
                          📋
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportPrefab(prefab.id);
                          }}
                          className="text-yellow-400 hover:text-yellow-300 text-sm"
                          title="Exportar"
                        >
                          📤
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePrefab(prefab.id);
                          }}
                          className="text-red-400 hover:text-red-300 text-sm"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel de Detalles/Acciones */}
          <div className="space-y-4">
            {selectedPrefab ? (
              <div className="bg-slate-700 p-4 rounded">
                <h3 className="text-lg font-semibold text-blue-400 mb-3">
                  🔍 Detalles: {selectedPrefab.name}
                </h3>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-slate-400">ID:</span>
                    <span className="ml-2 font-mono text-xs">{selectedPrefab.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Descripción:</span>
                    <div className="ml-2 mt-1">{selectedPrefab.description || 'Sin descripción'}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Componentes:</span>
                    <span className="ml-2 text-purple-400">{selectedPrefab.componentCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Instancias:</span>
                    <span className="ml-2 text-green-400">{selectedPrefab.instanceCount}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Creado:</span>
                    <span className="ml-2 text-slate-300">{new Date(selectedPrefab.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleInstantiatePrefab(selectedPrefab.id)}
                    className="flex-1 bg-green-600 hover:bg-green-500 rounded py-2"
                  >
                    📦 Instanciar
                  </button>
                  <button
                    onClick={() => handleExportPrefab(selectedPrefab.id)}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-500 rounded py-2"
                  >
                    📤 Exportar
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-700 p-4 rounded text-center text-slate-400">
                <div className="text-4xl mb-2">🏗️</div>
                <div>Selecciona un prefab</div>
                <div className="text-sm mt-2">para ver sus detalles</div>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Crear Prefab desde Entidad */}
        {showCreateFromEntity && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center">
            <div className="bg-slate-800 p-6 rounded-lg max-w-md w-full">
              <h3 className="text-lg font-semibold text-green-400 mb-4">➕ Crear Prefab desde Entidad</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Entidad Base</label>
                  <select
                    value={selectedEntity?.id || ''}
                    onChange={(e) => {
                      const entity = availableEntities.find(ent => ent.id.toString() === e.target.value);
                      setSelectedEntity(entity);
                    }}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                  >
                    <option value="">Seleccionar entidad...</option>
                    {availableEntities.map(entity => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name} ({entity.componentCount} componentes)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Nombre del Prefab</label>
                  <input
                    type="text"
                    value={newPrefabName}
                    onChange={(e) => setNewPrefabName(e.target.value)}
                    placeholder="Ej: Cubo Rojo"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Descripción</label>
                  <textarea
                    value={newPrefabDescription}
                    onChange={(e) => setNewPrefabDescription(e.target.value)}
                    placeholder="Descripción opcional..."
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCreatePrefabFromEntity}
                    disabled={!selectedEntity || !newPrefabName.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 rounded py-2"
                  >
                    Crear Prefab
                  </button>
                  <button
                    onClick={() => setShowCreateFromEntity(false)}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Import/Export */}
        {showImportExport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center">
            <div className="bg-slate-800 p-6 rounded-lg max-w-lg w-full">
              <h3 className="text-lg font-semibold text-purple-400 mb-4">📤 Import/Export Prefabs</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-2">JSON del Prefab</label>
                  <textarea
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    placeholder='{"name": "Mi Prefab", "components": {...}}'
                    rows={8}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 font-mono text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleImportPrefab}
                    disabled={!importJson.trim()}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 rounded py-2"
                  >
                    📥 Importar
                  </button>
                  <button
                    onClick={() => setShowImportExport(false)}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="text-xs text-slate-400 mt-2">
                  💡 Puedes exportar prefabs desde otros proyectos y importarlos aquí
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
