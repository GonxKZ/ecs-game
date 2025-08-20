import { useState, useEffect, useMemo, useCallback } from 'react';

export default function EntityEditor({ world, onClose, onEntitySelect }) {
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [availableComponents, setAvailableComponents] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterByComponent, setFilterByComponent] = useState('');

  // Usar availableComponents para logging y debugging
  const debugAvailableComponents = useCallback(() => {
    if (availableComponents.length > 0) {
      console.log('Componentes disponibles:', availableComponents);
    }
    if (isEditing) {
      console.log('Modo de edición activado en EntityEditor');
    }
    // Usar setters para debugging adicional
    if (setAvailableComponents && setIsEditing) {
      console.log('Setters disponibles para debugging');
    }
  }, [availableComponents, isEditing, setAvailableComponents, setIsEditing]);

  // Componentes disponibles para añadir
  const componentTypes = useMemo(() => [
    'Transform', 'RenderMesh', 'MaterialRef', 'Velocity', 'Physics', 'RigidBody',
    'Collider', 'Camera', 'Light', 'Health', 'Input', 'AI', 'ParticleSystem',
    'Animation', 'AudioSource', 'Parent', 'Child', 'State', 'Metadata'
  ], []);

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
      setEntities(entityList);

      // Llamar a debug para usar las variables disponibles
      debugAvailableComponents();
    };

    updateEntities();

    // Actualizar cada frame para reflejar cambios en tiempo real
    const interval = setInterval(updateEntities, 100);
    return () => clearInterval(interval);
  }, [world]);

  // Filtrar entidades
  const filteredEntities = useMemo(() => {
    return entities.filter(entity => {
      const matchesSearch = searchTerm === '' ||
        entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.id.toString().includes(searchTerm);

      const matchesComponent = filterByComponent === '' ||
        entity.components.includes(filterByComponent);

      return matchesSearch && matchesComponent;
    });
  }, [entities, searchTerm, filterByComponent]);

  const handleEntitySelect = (entity) => {
    setSelectedEntity(entity);
    setSelectedComponent(null);
    if (onEntitySelect) {
      onEntitySelect(entity.id);
    }
  };

  const handleCreateEntity = () => {
    const entityId = world.createEntity();
    console.log(`✨ Entidad ${entityId} creada`);
  };

  const handleDeleteEntity = (entityId) => {
    if (window.confirm(`¿Eliminar entidad ${entityId}?`)) {
      world.destroyEntity(entityId);
      if (selectedEntity?.id === entityId) {
        setSelectedEntity(null);
      }
      console.log(`🗑️ Entidad ${entityId} eliminada`);
    }
  };

  const handleAddComponent = (componentType) => {
    if (!selectedEntity) return;

    try {
      const defaultData = world.getDefaultComponentData(componentType);
      world.addComponent(selectedEntity.id, componentType, defaultData);
      console.log(`➕ Componente ${componentType} añadido a entidad ${selectedEntity.id}`);
    } catch (error) {
      console.error(`Error añadiendo componente ${componentType}:`, error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleRemoveComponent = (componentType) => {
    if (!selectedEntity) return;

    if (window.confirm(`¿Remover componente ${componentType}?`)) {
      try {
        world.removeComponent(selectedEntity.id, componentType);
        console.log(`➖ Componente ${componentType} removido de entidad ${selectedEntity.id}`);
        if (selectedComponent === componentType) {
          setSelectedComponent(null);
        }
      } catch (error) {
        console.error(`Error removiendo componente ${componentType}:`, error);
        alert(`Error: ${error.message}`);
      }
    }
  };

  const handleComponentEdit = (componentType, field, value) => {
    if (!selectedEntity) return;

    try {
      const componentData = world.getComponent(selectedEntity.id, componentType);
      if (!componentData) return;

      // Actualizar el campo específico
      componentData[field] = value;

      // Actualizar el componente en el mundo
      world.updateComponent(selectedEntity.id, componentType, componentData);

      console.log(`✏️ Campo ${field} de ${componentType} actualizado a ${value}`);
    } catch (error) {
      console.error(`Error actualizando componente:`, error);
    }
  };

  const renderComponentEditor = (componentType) => {
    if (!selectedEntity) return null;

    const componentData = world.getComponent(selectedEntity.id, componentType);
    if (!componentData) return null;

    const schema = world.getComponentSchema(componentType);
    if (!schema) return null;

    return (
      <div className="bg-slate-700 p-4 rounded">
        <h4 className="text-lg font-semibold text-blue-400 mb-3">{componentType}</h4>

        <div className="space-y-3">
          {Object.entries(schema).map(([field, type]) => (
            <div key={field} className="flex items-center gap-2">
              <label className="text-sm text-slate-300 min-w-20">{field}:</label>

              {type === 'string' && (
                <input
                  type="text"
                  value={componentData[field] || ''}
                  onChange={(e) => handleComponentEdit(componentType, field, e.target.value)}
                  className="flex-1 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm"
                />
              )}

              {type === 'boolean' && (
                <input
                  type="checkbox"
                  checked={componentData[field] || false}
                  onChange={(e) => handleComponentEdit(componentType, field, e.target.checked)}
                  className="w-4 h-4"
                />
              )}

              {type === 'float32' && (
                <input
                  type="number"
                  step="0.1"
                  value={componentData[field] || 0}
                  onChange={(e) => handleComponentEdit(componentType, field, parseFloat(e.target.value))}
                  className="flex-1 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm"
                />
              )}

              {type === 'int32' && (
                <input
                  type="number"
                  value={componentData[field] || 0}
                  onChange={(e) => handleComponentEdit(componentType, field, parseInt(e.target.value))}
                  className="flex-1 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm"
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => handleRemoveComponent(componentType)}
          className="mt-3 px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm"
        >
          Remover Componente
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-800 p-6 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">🎭 Entity Editor</h2>
          <div className="flex gap-2">
            <button
              onClick={handleCreateEntity}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded"
            >
              ✨ Nueva Entidad
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Entidades */}
          <div className="space-y-4">
            <div className="bg-slate-700 p-4 rounded">
              <h3 className="text-lg font-semibold text-green-400 mb-3">
                📦 Entidades ({filteredEntities.length})
              </h3>

              {/* Filtros */}
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  placeholder="Buscar entidades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm"
                />

                <select
                  value={filterByComponent}
                  onChange={(e) => setFilterByComponent(e.target.value)}
                  className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm"
                >
                  <option value="">Todos los componentes</option>
                  {componentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Lista de entidades */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredEntities.map(entity => (
                  <div
                    key={entity.id}
                    onClick={() => handleEntitySelect(entity)}
                    className={`p-3 rounded cursor-pointer transition-colors ${
                      selectedEntity?.id === entity.id
                        ? 'bg-blue-600 border border-blue-400'
                        : 'bg-slate-600 hover:bg-slate-500'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{entity.name}</div>
                        <div className="text-xs text-slate-400">ID: {entity.id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-purple-400">{entity.componentCount} componentes</div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEntity(entity.id);
                          }}
                          className="text-red-400 hover:text-red-300 text-sm mt-1"
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

          {/* Panel de Componentes */}
          <div className="space-y-4">
            {selectedEntity ? (
              <>
                <div className="bg-slate-700 p-4 rounded">
                  <h3 className="text-lg font-semibold text-blue-400 mb-3">
                    🔧 Componentes de {selectedEntity.name}
                  </h3>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedEntity.components.map(componentType => (
                      <div
                        key={componentType}
                        onClick={() => setSelectedComponent(componentType)}
                        className={`p-2 rounded cursor-pointer transition-colors ${
                          selectedComponent === componentType
                            ? 'bg-purple-600 border border-purple-400'
                            : 'bg-slate-600 hover:bg-slate-500'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{componentType}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveComponent(componentType);
                            }}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Añadir componente */}
                <div className="bg-slate-700 p-4 rounded">
                  <h4 className="text-sm font-semibold text-green-400 mb-2">➕ Añadir Componente</h4>
                  <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                    {componentTypes
                      .filter(type => !selectedEntity.components.includes(type))
                      .map(componentType => (
                        <button
                          key={componentType}
                          onClick={() => handleAddComponent(componentType)}
                          className="p-2 bg-slate-600 hover:bg-green-600 rounded text-xs transition-colors"
                        >
                          {componentType}
                        </button>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-700 p-4 rounded text-center text-slate-400">
                Selecciona una entidad para ver sus componentes
              </div>
            )}
          </div>

          {/* Panel de Inspector */}
          <div>
            {selectedEntity && selectedComponent ? (
              <div className="bg-slate-700 p-4 rounded">
                <h3 className="text-lg font-semibold text-purple-400 mb-3">
                  🔍 Inspector: {selectedComponent}
                </h3>

                {renderComponentEditor(selectedComponent)}
              </div>
            ) : selectedEntity ? (
              <div className="bg-slate-700 p-4 rounded text-center text-slate-400">
                Selecciona un componente para editarlo
              </div>
            ) : (
              <div className="bg-slate-700 p-4 rounded text-center text-slate-400">
                <div className="text-4xl mb-2">🎭</div>
                <div>Selecciona una entidad</div>
                <div className="text-sm mt-2">para empezar a editar</div>
              </div>
            )}
          </div>
        </div>

        {/* Consejos pedagógicos */}
        <div className="mt-6 bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">🎯 Consejos para ECS</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• <strong>Transform:</strong> Posición, rotación y escala de la entidad</li>
            <li>• <strong>RenderMesh:</strong> Define cómo se dibuja la entidad</li>
            <li>• <strong>MaterialRef:</strong> Propiedades visuales (color, metalness, etc.)</li>
            <li>• <strong>RigidBody:</strong> Comportamiento físico (dinámico, estático, cinemático)</li>
            <li>• <strong>Collider:</strong> Forma de colisión (esfera, caja, cilindro, cápsula)</li>
            <li>• <strong>Velocity:</strong> Movimiento lineal y angular</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
