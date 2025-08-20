import { useState, useEffect } from 'react';

export default function ResourcePanel({ resourceManager, onResourceUpdate }) {
  const [resources, setResources] = useState({});
  const [selectedResource, setSelectedResource] = useState(null);

  // Actualizar lista de recursos
  useEffect(() => {
    if (!resourceManager) return;

    const updateResources = () => {
      const stats = resourceManager.getStats();
      setResources(stats.resources.reduce((acc, resource) => {
        acc[resource.name] = resourceManager.getResource(resource.name);
        return acc;
      }, {}));
    };

    updateResources();
    const interval = setInterval(updateResources, 1000);
    return () => clearInterval(interval);
  }, [resourceManager]);

  const handleResourceChange = (resourceName, propertyName, value) => {
    if (resourceManager) {
      resourceManager.updateResource(resourceName, { [propertyName]: value });
      onResourceUpdate?.(resourceName, propertyName, value);
    }
  };

  const handleAddResource = () => {
    const name = prompt('Nombre del nuevo recurso:');
    if (name && !resources[name]) {
      resourceManager.setResource(name, { value: 0 });
    }
  };

  if (!resourceManager) {
    return <div className="text-slate-400">Sistema de recursos no disponible</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-lg text-purple-400">Recursos Globales</h3>
        <button
          onClick={handleAddResource}
          className="btn btn-primary btn-sm"
        >
          + Recurso
        </button>
      </div>

      {/* Lista de recursos */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {Object.keys(resources).length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <div className="text-3xl mb-2">🎛️</div>
            <p>No hay recursos definidos</p>
            <p className="text-xs mt-1">¡Crea tu primer recurso global!</p>
          </div>
        ) : (
          Object.entries(resources).map(([name, data]) => (
            <div
              key={name}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedResource === name
                  ? 'border-purple-400 bg-purple-900/20'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
              }`}
              onClick={() => setSelectedResource(selectedResource === name ? null : name)}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-cyan-400">{name}</span>
                <span className="text-xs text-slate-400">
                  {Object.keys(data).length} propiedades
                </span>
              </div>

              {selectedResource === name && (
                <div className="mt-3 space-y-2">
                  {Object.entries(data).map(([key, value]) => (
                    <div key={key} className="flex flex-col">
                      <label className="text-xs text-slate-400 mb-1">{key}</label>
                      {typeof value === 'number' ? (
                        <input
                          type="range"
                          min={0}
                          max={typeof value === 'number' && value <= 1 ? 1 : 100}
                          step={typeof value === 'number' && value <= 1 ? 0.01 : 1}
                          value={value}
                          onChange={(e) => handleResourceChange(name, key, parseFloat(e.target.value))}
                          className="w-full"
                        />
                      ) : typeof value === 'boolean' ? (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => handleResourceChange(name, key, e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">{value ? 'Activado' : 'Desactivado'}</span>
                        </label>
                      ) : (
                        <input
                          type="text"
                          value={String(value)}
                          onChange={(e) => handleResourceChange(name, key, e.target.value)}
                          className="bg-slate-700 p-1 rounded text-sm"
                        />
                      )}
                      <span className="text-xs text-slate-500 mt-1">
                        {typeof value} = {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Información educativa */}
      <div className="mt-4 p-3 bg-blue-900/20 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 ¿Qué son los recursos?</h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          Los recursos son datos globales que no pertenecen a entidades específicas.
          Son perfectos para configuraciones, estados del juego, o datos compartidos entre sistemas.
        </p>
      </div>
    </div>
  );
}
