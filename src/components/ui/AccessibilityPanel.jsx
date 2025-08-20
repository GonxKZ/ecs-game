import { useState, useEffect } from 'react';

export default function AccessibilityPanel({ accessibilitySystem, onClose }) {
  const [settings, setSettings] = useState({});
  const [isVisible, setIsVisible] = useState(true);

  // Usar onClose para funcionalidad de cierre del panel
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
    // Logging para debugging
    console.log('AccessibilityPanel cerrado');
  };

  // Actualizar configuración del sistema
  useEffect(() => {
    if (!accessibilitySystem) return;

    const updateSettings = () => {
      setSettings(accessibilitySystem.getSettings());
    };

    updateSettings();
    const interval = setInterval(updateSettings, 1000);
    return () => clearInterval(interval);
  }, [accessibilitySystem]);

  const handleSettingChange = (settingName, value) => {
    if (accessibilitySystem) {
      const newSettings = { ...settings, [settingName]: value };
      setSettings(newSettings);
      accessibilitySystem.setSettings(newSettings);
    }
  };

  const activateProfile = (profileName) => {
    if (accessibilitySystem) {
      accessibilitySystem.activateProfile(profileName);
      // Actualizar settings después de un breve delay
      setTimeout(() => {
        setSettings(accessibilitySystem.getSettings());
      }, 100);
    }
  };

  const profiles = [
    { name: 'default', label: 'Por Defecto', description: 'Configuración estándar' },
    { name: 'highContrast', label: 'Alto Contraste', description: 'Mejor visibilidad' },
    { name: 'motorDisability', label: 'Discapacidad Motora', description: 'Movimiento reducido, navegación por teclado' },
    { name: 'visualImpairment', label: 'Discapacidad Visual', description: 'Texto grande, audio cues' },
    { name: 'cognitive', label: 'Dificultades Cognitivas', description: 'Interfaz simplificada' }
  ];

  if (!isVisible) {
    return (
      <div
        className="fixed top-128 left-4 z-50 bg-black/80 text-white px-3 py-2 rounded text-sm cursor-pointer border border-green-500/30"
        onClick={() => setIsVisible(true)}
        title="Mostrar Panel de Accesibilidad"
      >
        ♿ Accesibilidad
      </div>
    );
  }

  return (
    <div className="fixed top-128 left-4 w-96 h-[600px] bg-gray-900/95 backdrop-blur-sm rounded-lg border border-green-500/30 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-green-500/30">
        <h3 className="text-green-400 font-bold text-lg">♿ Panel de Accesibilidad</h3>
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-lg"
          >
            ×
          </button>
        </div>
      </div>

      {/* Perfiles Rápidos */}
      <div className="p-4 border-b border-gray-700">
        <h4 className="text-white font-semibold text-sm mb-3">👤 Perfiles Rápidos</h4>
        <div className="space-y-2">
          {profiles.map(profile => (
            <button
              key={profile.name}
              onClick={() => activateProfile(profile.name)}
              className="w-full p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded text-left transition-colors"
            >
              <div className="font-medium text-white">{profile.label}</div>
              <div className="text-xs text-gray-400">{profile.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Configuración Individual */}
      <div className="p-4 border-b border-gray-700 space-y-4">
        <h4 className="text-white font-semibold text-sm mb-3">⚙️ Configuración</h4>

        <div className="space-y-3">
          {/* Alto Contraste */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">🎨 Alto Contraste</div>
              <div className="text-xs text-gray-400">Mejora la visibilidad</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.highContrast || false}
                onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            </label>
          </div>

          {/* Movimiento Reducido */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">🎭 Movimiento Reducido</div>
              <div className="text-xs text-gray-400">Reduce animaciones y transiciones</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.reducedMotion || false}
                onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            </label>
          </div>

          {/* Texto Grande */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">📝 Texto Grande</div>
              <div className="text-xs text-gray-400">Aumenta el tamaño de fuente</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.largeText || false}
                onChange={(e) => handleSettingChange('largeText', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            </label>
          </div>

          {/* Indicadores de Foco */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">🎯 Indicadores de Foco</div>
              <div className="text-xs text-gray-400">Resalta elementos enfocados</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.focusIndicators || false}
                onChange={(e) => handleSettingChange('focusIndicators', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            </label>
          </div>

          {/* Audio Cues */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">🔊 Pistas de Audio</div>
              <div className="text-xs text-gray-400">Sonidos para acciones importantes</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.audioCues || false}
                onChange={(e) => handleSettingChange('audioCues', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            </label>
          </div>

          {/* Navegación por Teclado */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">⌨️ Navegación por Teclado</div>
              <div className="text-xs text-gray-400">Mejora la navegación sin mouse</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.keyboardNavigation || false}
                onChange={(e) => handleSettingChange('keyboardNavigation', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Información del Sistema */}
      <div className="p-4 border-b border-gray-700">
        <h4 className="text-white font-semibold text-sm mb-3">💻 Detectado por Sistema</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Movimiento Reducido:</span>
            <span className={`font-bold ${
              window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'text-green-400' : 'text-red-400'
            }`}>
              {window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Sí' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Alto Contraste:</span>
            <span className={`font-bold ${
              window.matchMedia('(prefers-contrast: high)').matches
                ? 'text-green-400' : 'text-red-400'
            }`}>
              {window.matchMedia('(prefers-contrast: high)').matches ? 'Sí' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Modo Oscuro:</span>
            <span className={`font-bold ${
              window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'text-green-400' : 'text-red-400'
            }`}>
              {window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Sí' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="p-4 space-y-2">
        <button
          onClick={() => accessibilitySystem.reset()}
          className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-medium transition-colors"
        >
          🔄 Reset Sistema
        </button>
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-800/50 border-t border-gray-700 text-xs text-gray-400">
        💡 Las configuraciones se aplican automáticamente. Usa perfiles para configuraciones optimizadas.
      </div>
    </div>
  );
}
