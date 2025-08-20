import { useState, useEffect } from 'react';

export default function DeterministicRecorderUI({ recorder, onClose }) {
  const [isVisible, setIsVisible] = useState(true);
  const [state, setState] = useState({});
  const [stats, setStats] = useState({});
  const [savedRecordings, setSavedRecordings] = useState([]);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [recordingName, setRecordingName] = useState('');
  const [seedInput, setSeedInput] = useState('');

  // Actualizar estado del grabador
  useEffect(() => {
    if (!recorder) return;

    const updateState = () => {
      setState(recorder.getState());
      setStats(recorder.getStats());
      setSavedRecordings(recorder.listSavedRecordings());
    };

    updateState();
    const interval = setInterval(updateState, 500);
    return () => clearInterval(interval);
  }, [recorder]);

  const handleStartRecording = () => {
    const seed = seedInput ? parseInt(seedInput) : Date.now();
    recorder.startRecording(seed);
    setSeedInput('');
  };

  const handleStopRecording = () => {
    const recording = recorder.stopRecording();
    if (recording && recordingName) {
      recorder.saveRecording(recordingName, recording);
      setRecordingName('');
    }
  };

  const handleStartPlayback = () => {
    if (selectedRecording) {
      const recording = recorder.loadRecording(selectedRecording);
      if (recording) {
        recorder.startPlayback(recording);
      }
    }
  };

  const handleStopPlayback = () => {
    recorder.stopPlayback();
  };

  const handleSaveRecording = () => {
    if (recordingName && recorder.currentRecording) {
      recorder.saveRecording(recordingName);
      setRecordingName('');
    }
  };

  const handleLoadRecording = (name) => {
    const recording = recorder.loadRecording(name);
    if (recording) {
      setSelectedRecording(name);
    }
  };

  const handleDeleteRecording = (name) => {
    recorder.deleteRecording(name);
    if (selectedRecording === name) {
      setSelectedRecording(null);
    }
  };

  const handleExportRecording = () => {
    if (recorder.currentRecording) {
      recorder.exportRecording();
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '0s';
    const seconds = Math.round(ms / 1000);
    return `${seconds}s`;
  };

  const formatSize = (kb) => {
    if (!kb) return '0 KB';
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (!isVisible) {
    return (
      <div
        className="fixed top-96 left-4 z-50 bg-black/80 text-white px-3 py-2 rounded text-sm cursor-pointer border border-blue-500/30"
        onClick={() => setIsVisible(true)}
        title="Mostrar Deterministic Recorder"
      >
        🎬 Recorder
      </div>
    );
  }

  return (
    <div className="fixed top-96 left-4 w-96 h-[600px] bg-gray-900/95 backdrop-blur-sm rounded-lg border border-blue-500/30 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-blue-500/30">
        <h3 className="text-blue-400 font-bold text-lg">🎬 Deterministic Recorder</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white text-lg"
          >
            ×
          </button>
        </div>
      </div>

      {/* Estado Actual */}
      <div className="p-4 border-b border-gray-700">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-400">Estado:</span>
            <span className={`ml-1 font-bold ${
              state.isRecording ? 'text-red-400' :
              state.isPlaying ? 'text-green-400' : 'text-gray-400'
            }`}>
              {state.isRecording ? 'Grabando' :
               state.isPlaying ? 'Reproduciendo' : 'Detenido'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Frames:</span>
            <span className="ml-1 text-white">
              {state.isPlaying ? `${state.currentFrame}/${state.totalFrames}` :
               state.hasRecording ? state.totalFrames : 0}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Semilla:</span>
            <span className="ml-1 text-white font-mono text-xs">{state.seed || 0}</span>
          </div>
          <div>
            <span className="text-gray-400">Tamaño:</span>
            <span className="ml-1 text-white">{formatSize(stats.size)}</span>
          </div>
        </div>
      </div>

      {/* Controles de Grabación */}
      <div className="p-4 border-b border-gray-700 space-y-3">
        <h4 className="text-white font-semibold text-sm">🎬 Grabación</h4>

        {!state.isRecording && !state.isPlaying && (
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Semilla RNG</label>
              <input
                type="number"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="Auto (timestamp)"
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
              />
            </div>

            <button
              onClick={handleStartRecording}
              className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors"
            >
              ⏺️ Iniciar Grabación
            </button>
          </div>
        )}

        {state.isRecording && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={recordingName}
                onChange={(e) => setRecordingName(e.target.value)}
                placeholder="Nombre de la grabación"
                className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
              />
              <button
                onClick={handleSaveRecording}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium"
              >
                💾
              </button>
            </div>

            <button
              onClick={handleStopRecording}
              className="w-full py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
            >
              ⏹️ Detener Grabación
            </button>
          </div>
        )}
      </div>

      {/* Controles de Reproducción */}
      <div className="p-4 border-b border-gray-700 space-y-3">
        <h4 className="text-white font-semibold text-sm">▶️ Reproducción</h4>

        {!state.isPlaying && (
          <div className="space-y-2">
            <select
              value={selectedRecording || ''}
              onChange={(e) => setSelectedRecording(e.target.value)}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
            >
              <option value="">Seleccionar grabación...</option>
              {savedRecordings.map(rec => (
                <option key={rec.name} value={rec.name}>
                  {rec.name} ({rec.frameCount} frames, {formatDuration(rec.duration)})
                </option>
              ))}
            </select>

            <button
              onClick={handleStartPlayback}
              disabled={!selectedRecording}
              className="w-full py-2 px-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
            >
              ▶️ Iniciar Reproducción
            </button>
          </div>
        )}

        {state.isPlaying && (
          <button
            onClick={handleStopPlayback}
            className="w-full py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm font-medium transition-colors"
          >
            ⏸️ Detener Reproducción
          </button>
        )}
      </div>

      {/* Grabaciones Guardadas */}
      <div className="p-4 border-b border-gray-700">
        <h4 className="text-white font-semibold text-sm mb-2">💾 Grabaciones Guardadas</h4>

        <div className="max-h-40 overflow-y-auto space-y-1">
          {savedRecordings.length === 0 ? (
            <div className="text-gray-500 text-center py-4 text-sm">No hay grabaciones guardadas</div>
          ) : (
            savedRecordings.map(rec => (
              <div key={rec.name} className="bg-gray-800/50 p-2 rounded text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white font-medium truncate">{rec.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleLoadRecording(rec.name)}
                      className="text-blue-400 hover:text-blue-300"
                      title="Cargar"
                    >
                      📂
                    </button>
                    <button
                      onClick={() => handleDeleteRecording(rec.name)}
                      className="text-red-400 hover:text-red-300"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="text-gray-400 space-y-1">
                  <div>Frames: {rec.frameCount}</div>
                  <div>Duración: {formatDuration(rec.duration)}</div>
                  <div className="text-xs">{new Date(rec.timestamp).toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Acciones Avanzadas */}
      <div className="p-4 space-y-2">
        <button
          onClick={handleExportRecording}
          disabled={!recorder.currentRecording}
          className="w-full py-2 px-4 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
        >
          📤 Exportar Grabación
        </button>

        <button
          onClick={() => recorder.reset()}
          className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-medium transition-colors"
        >
          🔄 Reset Grabador
        </button>
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-800/50 border-t border-gray-700 text-xs text-gray-400">
        💡 Las grabaciones garantizan reproducción idéntica con la misma semilla RNG.
      </div>
    </div>
  );
}
