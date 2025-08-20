import { useState } from 'react';
import { ComponentDefinitions } from '../../ecs/components.js';
import PerformancePanel from './PerformancePanel.jsx';
import ResourcePanel from './ResourcePanel.jsx';
import PersistencePanel from './PersistencePanel.jsx';

export default function ECSPanel({
  world,
  stats,
  selectedEntity,
  onCreateEntity,
  onDeleteEntity,
  onSelectEntity
}) {
  const [activeTab, setActiveTab] = useState('entities');
  const [newComponentType, setNewComponentType] = useState('');
  const [componentData, setComponentData] = useState({});

  // Obtener entidades para mostrar
  const getEntities = () => {
    if (!world) return [];
    return Array.from(world.entities.entries()).map(([id, components]) => ({
      id,
      components: Array.from(components),
      data: Object.fromEntries(
        Array.from(components).map(compType => [
          compType,
          world.getComponent(id, compType)
        ])
      )
    }));
  };

  const entities = getEntities();

  // Añadir componente a entidad seleccionada
  const handleAddComponent = () => {
    if (!selectedEntity || !newComponentType) return;

    const defaultData = ComponentDefinitions[newComponentType];
    if (!defaultData) return;

    world.addComponent(selectedEntity, newComponentType, { ...defaultData, ...componentData });
    setNewComponentType('');
    setComponentData({});
  };

  // Remover componente de entidad seleccionada
  const handleRemoveComponent = (componentType) => {
    if (!selectedEntity) return;
    world.removeComponent(selectedEntity, componentType);
  };

  // Actualizar datos de componente
  const handleComponentDataChange = (key, value) => {
    setComponentData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Tabs */}
      <div className="flex mb-6 bg-slate-800/50 rounded-lg p-1">
        {['entities', 'components', 'systems', 'performance', 'resources', 'persistence'].map(tab => (
          <button
            key={tab}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
              activeTab === tab
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'entities' && '🏗️ '}
            {tab === 'components' && '📦 '}
            {tab === 'systems' && '⚙️ '}
            {tab === 'performance' && '📊 '}
            {tab === 'resources' && '🎛️ '}
            {tab === 'persistence' && '💾 '}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Contenido de las tabs */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'entities' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-white mb-1">Entidades</h3>
                <p className="text-xs text-slate-400">{entities.length} entidades activas</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onCreateEntity('sphere')}
                  className="btn btn-secondary btn-sm"
                  title="Crear esfera básica"
                >
                  <span>🔵</span>
                  Esfera
                </button>
                <button
                  onClick={() => onCreateEntity('cube')}
                  className="btn btn-primary btn-sm"
                  title="Crear cubo básico"
                >
                  <span>📦</span>
                  Cubo
                </button>
                <button
                  onClick={() => onCreateEntity('particle_emitter')}
                  className="btn btn-warning btn-sm"
                  title="Crear emisor de partículas"
                >
                  <span>✨</span>
                  Partículas
                </button>
                <button
                  onClick={() => onCreateEntity('physics_object')}
                  className="btn btn-secondary btn-sm"
                  title="Crear objeto con física"
                >
                  <span>⚛️</span>
                  Física
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {entities.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-4xl mb-2">🏗️</div>
                  <p>No hay entidades creadas</p>
                  <p className="text-xs mt-1">¡Crea tu primera entidad!</p>
                </div>
              ) : (
                entities.map(entity => (
                  <div
                    key={entity.id}
                    className={`entity-card ${selectedEntity === entity.id ? 'selected' : ''}`}
                    onClick={() => onSelectEntity(entity.id)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <span className="font-mono text-sm font-bold text-purple-400">
                          #{entity.id}
                        </span>
                        <span className="text-xs text-slate-400 ml-2">
                          {entity.components.length} componentes
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteEntity(entity.id);
                        }}
                        className="text-red-400 hover:text-red-300 text-sm p-1 hover:bg-red-900/20 rounded"
                        title="Eliminar entidad"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {entity.components.slice(0, 3).map(compType => (
                        <span
                          key={compType}
                          className="text-xs bg-slate-700 px-2 py-1 rounded"
                        >
                          {compType}
                        </span>
                      ))}
                      {entity.components.length > 3 && (
                        <span className="text-xs text-slate-500">
                          +{entity.components.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'components' && (
          <div>
            <h3 className="font-bold mb-4">Componentes</h3>

            {selectedEntity ? (
              <div>
                <div className="mb-4">
                  <h4 className="font-semibold mb-2">Añadir Componente</h4>
                  <select
                    value={newComponentType}
                    onChange={(e) => setNewComponentType(e.target.value)}
                    className="w-full bg-gray-700 p-2 rounded mb-2"
                  >
                    <option value="">Seleccionar componente...</option>
                    {Object.keys(ComponentDefinitions).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>

                  {newComponentType && (
                    <div className="space-y-2">
                      {Object.entries(ComponentDefinitions[newComponentType]).map(([key, defaultValue]) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-400 mb-1">{key}</label>
                          <input
                            type={typeof defaultValue === 'number' ? 'number' : 'text'}
                            step={typeof defaultValue === 'number' ? '0.1' : undefined}
                            value={componentData[key] ?? defaultValue}
                            onChange={(e) => handleComponentDataChange(
                              key,
                              typeof defaultValue === 'number' ? parseFloat(e.target.value) : e.target.value
                            )}
                            className="w-full bg-gray-700 p-1 rounded text-sm"
                          />
                        </div>
                      ))}
                      <button
                        onClick={handleAddComponent}
                        className="w-full bg-ecs-green hover:bg-green-600 py-2 rounded text-sm"
                      >
                        Añadir Componente
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Componentes Actuales</h4>
                  <div className="space-y-2">
                    {entities.find(e => e.id === selectedEntity)?.components.map(compType => (
                      <div key={compType} className="bg-gray-700 p-2 rounded">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-ecs-blue">{compType}</span>
                          <button
                            onClick={() => handleRemoveComponent(compType)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Remover
                          </button>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {Object.entries(entities.find(e => e.id === selectedEntity)?.data[compType] || {})
                            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                            .join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Selecciona una entidad para gestionar sus componentes</p>
            )}
          </div>
        )}

        {activeTab === 'systems' && (
          <div>
            <h3 className="font-bold mb-4">Sistemas ({Object.keys(stats.systems || {}).length})</h3>
            <div className="space-y-3">
              {Object.entries(stats.systems || {}).map(([name, systemStats]) => (
                <div key={name} className="bg-gray-700 p-3 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-ecs-green">{name}</span>
                    <span className="text-xs text-gray-400">
                      {systemStats.lastExecutionTime?.toFixed(2)}ms
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Sistema activo y funcionando
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div>
            <PerformancePanel world={world} stats={stats} />
          </div>
        )}

        {activeTab === 'resources' && (
          <div>
            <ResourcePanel
              resourceManager={world?.resourceManager}
              onResourceUpdate={(name, property, value) =>
                console.log(`Recurso ${name}.${property} = ${value}`)
              }
            />
          </div>
        )}

        {activeTab === 'persistence' && (
          <div>
            <PersistencePanel
              world={world}
              onAddConsoleMessage={(message) => {
                // Enviar mensaje a través del sistema de consola
                if (window.dispatchEvent) {
                  window.dispatchEvent(new CustomEvent('console-message', { detail: message }));
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
