import { useState, useEffect } from 'react';
import * as THREE from 'three';

export default function ShaderLaboratory({ world, pbrSystem, onClose }) {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [shaderEffect, setShaderEffect] = useState('none');
  const [effectParams, setEffectParams] = useState({
    glowIntensity: 0.5,
    glowColor: '#00ff88',
    dissolveThreshold: 0.5,
    dissolveEdgeWidth: 0.05,
    dissolveEdgeColor: '#ff4444'
  });
  const [shaderCode, setShaderCode] = useState({
    original: '',
    modified: '',
    diff: []
  });
  const [entitiesWithMaterials, setEntitiesWithMaterials] = useState([]);

  // Obtener entidades con materiales
  useEffect(() => {
    if (!world) return;

    const entities = world.queryEntities({
      components: ['RenderMesh', 'MaterialRef']
    });

    const entityList = [];
    for (const entityId of entities) {
      const renderMesh = world.getComponent(entityId, 'RenderMesh');
      const materialRef = world.getComponent(entityId, 'MaterialRef');

      if (renderMesh && materialRef) {
        entityList.push({
          id: entityId,
          name: `Entidad ${entityId}`,
          materialType: materialRef.materialType || 'standard'
        });
      }
    }

    setEntitiesWithMaterials(entityList);
    if (entityList.length > 0 && !selectedEntity) {
      setSelectedEntity(entityList[0].id);
    }
  }, [world, selectedEntity]);

  const applyShaderEffect = (effect) => {
    if (!selectedEntity || !pbrSystem) return;

    setShaderEffect(effect);

    // Obtener el objeto Three.js de la entidad
    const entityObject = pbrSystem.entityObjects.get(selectedEntity);
    if (!entityObject || !entityObject.material) return;

    // Reset material primero
    if (entityObject.originalMaterial) {
      entityObject.material = entityObject.originalMaterial;
    } else {
      entityObject.originalMaterial = entityObject.material;
    }

    // Aplicar efecto
    switch (effect) {
      case 'glow':
        entityObject.material = pbrSystem.createGlowMaterial(entityObject.material);
        // Configurar uniforms
        if (entityObject.material.uniforms) {
          entityObject.material.uniforms.glowIntensity.value = effectParams.glowIntensity;
          entityObject.material.uniforms.glowColor.value = new THREE.Color(effectParams.glowColor);
        }
        break;

      case 'dissolve':
        entityObject.material = pbrSystem.createDissolveMaterial(entityObject.material);
        // Configurar uniforms
        if (entityObject.material.uniforms) {
          entityObject.material.uniforms.dissolveThreshold.value = effectParams.dissolveThreshold;
          entityObject.material.uniforms.dissolveEdgeWidth.value = effectParams.dissolveEdgeWidth;
          entityObject.material.uniforms.dissolveEdgeColor.value = new THREE.Color(effectParams.dissolveEdgeColor);
        }
        break;

      case 'none':
      default:
        // Reset to original
        entityObject.material = entityObject.originalMaterial || entityObject.material;
        break;
    }

    entityObject.material.needsUpdate = true;

    // Generar diff del shader
    generateShaderDiff(effect);
  };

  const generateShaderDiff = (effect) => {
    const baseVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vNormal = normal;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

    const baseFragmentShader = `
uniform sampler2D map;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vec4 texColor = texture2D(map, vec2(0.0, 0.0));
    gl_FragColor = texColor;
}`;

    let modifiedVertexShader = baseVertexShader;
    let modifiedFragmentShader = baseFragmentShader;

    switch (effect) {
      case 'glow':
        modifiedVertexShader = baseVertexShader.replace(
          'varying vec3 vNormal;',
          'varying vec3 vNormal;\nvarying vec3 vPosition;'
        ).replace(
          'vNormal = normal;',
          'vNormal = normal;\nvPosition = position;'
        );

        modifiedFragmentShader = baseFragmentShader.replace(
          'void main() {',
          'uniform float glowIntensity;\nuniform vec3 glowColor;\n\nvoid main() {'
        ).replace(
          'gl_FragColor = texColor;',
          `gl_FragColor = texColor;

    // Glow effect
    float fresnel = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
    vec3 glow = glowColor * glowIntensity * fresnel;
    gl_FragColor.rgb += glow;`
        );
        break;

      case 'dissolve':
        modifiedFragmentShader = baseFragmentShader.replace(
          'void main() {',
          'uniform float dissolveThreshold;\nuniform float dissolveEdgeWidth;\nuniform vec3 dissolveEdgeColor;\n\nvoid main() {'
        ).replace(
          'gl_FragColor = texColor;',
          `gl_FragColor = texColor;

    // Dissolve effect
    float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    if (noise < dissolveThreshold) {
        discard;
    }

    // Edge effect
    if (noise < dissolveThreshold + dissolveEdgeWidth) {
        gl_FragColor.rgb = mix(gl_FragColor.rgb, dissolveEdgeColor, 0.8);
    }`
        );
        break;
    }

    setShaderCode({
      original: { vertex: baseVertexShader, fragment: baseFragmentShader },
      modified: { vertex: modifiedVertexShader, fragment: modifiedFragmentShader },
      diff: calculateDiff(baseFragmentShader, modifiedFragmentShader)
    });
  };

  const calculateDiff = (original, modified) => {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    const diff = [];

    let i = 0, j = 0;
    while (i < originalLines.length || j < modifiedLines.length) {
      if (i < originalLines.length && j < modifiedLines.length && originalLines[i] === modifiedLines[j]) {
        diff.push({ type: 'same', line: originalLines[i] });
        i++;
        j++;
      } else {
        // Buscar línea añadida o modificada
        if (j < modifiedLines.length) {
          diff.push({ type: 'added', line: modifiedLines[j] });
          j++;
        }
        if (i < originalLines.length) {
          diff.push({ type: 'removed', line: originalLines[i] });
          i++;
        }
      }
    }

    return diff;
  };

  const updateEffectParam = (param, value) => {
    const newParams = { ...effectParams, [param]: value };
    setEffectParams(newParams);

    // Actualizar uniforms en tiempo real
    if (selectedEntity && pbrSystem) {
      const entityObject = pbrSystem.entityObjects.get(selectedEntity);
      if (entityObject && entityObject.material && entityObject.material.uniforms) {
        switch (param) {
          case 'glowIntensity':
            if (entityObject.material.uniforms.glowIntensity) {
              entityObject.material.uniforms.glowIntensity.value = value;
            }
            break;
          case 'glowColor':
            if (entityObject.material.uniforms.glowColor) {
              entityObject.material.uniforms.glowColor.value = new THREE.Color(value);
            }
            break;
          case 'dissolveThreshold':
            if (entityObject.material.uniforms.dissolveThreshold) {
              entityObject.material.uniforms.dissolveThreshold.value = value;
            }
            break;
          case 'dissolveEdgeWidth':
            if (entityObject.material.uniforms.dissolveEdgeWidth) {
              entityObject.material.uniforms.dissolveEdgeWidth.value = value;
            }
            break;
          case 'dissolveEdgeColor':
            if (entityObject.material.uniforms.dissolveEdgeColor) {
              entityObject.material.uniforms.dissolveEdgeColor.value = new THREE.Color(value);
            }
            break;
        }
        entityObject.material.needsUpdate = true;
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-800 p-6 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">🧬 Shader Laboratory</h2>
          <div className="flex gap-2">
            <button
              onClick={() => applyShaderEffect('none')}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de Control */}
          <div className="space-y-6">
            {/* Selector de Entidad */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Entidad Objetivo
              </label>
              <select
                value={selectedEntity || ''}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2"
              >
                {entitiesWithMaterials.map(entity => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name} ({entity.materialType})
                  </option>
                ))}
              </select>
            </div>

            {/* Efectos de Shader */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Efecto de Shader
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => applyShaderEffect('none')}
                  className={`px-3 py-2 rounded text-sm ${
                    shaderEffect === 'none' ? 'bg-slate-600' : 'bg-slate-700'
                  } hover:bg-slate-600`}
                >
                  Ninguno
                </button>
                <button
                  onClick={() => applyShaderEffect('glow')}
                  className={`px-3 py-2 rounded text-sm ${
                    shaderEffect === 'glow' ? 'bg-green-600' : 'bg-slate-700'
                  } hover:bg-green-600`}
                >
                  Glow
                </button>
                <button
                  onClick={() => applyShaderEffect('dissolve')}
                  className={`px-3 py-2 rounded text-sm ${
                    shaderEffect === 'dissolve' ? 'bg-purple-600' : 'bg-slate-700'
                  } hover:bg-purple-600`}
                >
                  Dissolve
                </button>
              </div>
            </div>

            {/* Parámetros del Efecto */}
            {shaderEffect !== 'none' && (
              <div className="bg-slate-700 p-4 rounded">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">
                  Parámetros de {shaderEffect}
                </h4>

                {shaderEffect === 'glow' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Intensidad</label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={effectParams.glowIntensity}
                        onChange={(e) => updateEffectParam('glowIntensity', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-xs text-slate-400">{effectParams.glowIntensity}</span>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Color</label>
                      <input
                        type="color"
                        value={effectParams.glowColor}
                        onChange={(e) => updateEffectParam('glowColor', e.target.value)}
                        className="w-full h-8 rounded"
                      />
                    </div>
                  </div>
                )}

                {shaderEffect === 'dissolve' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Threshold</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={effectParams.dissolveThreshold}
                        onChange={(e) => updateEffectParam('dissolveThreshold', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-xs text-slate-400">{effectParams.dissolveThreshold}</span>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Ancho del Borde</label>
                      <input
                        type="range"
                        min="0"
                        max="0.2"
                        step="0.01"
                        value={effectParams.dissolveEdgeWidth}
                        onChange={(e) => updateEffectParam('dissolveEdgeWidth', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-xs text-slate-400">{effectParams.dissolveEdgeWidth}</span>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Color del Borde</label>
                      <input
                        type="color"
                        value={effectParams.dissolveEdgeColor}
                        onChange={(e) => updateEffectParam('dissolveEdgeColor', e.target.value)}
                        className="w-full h-8 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Visualización del Shader */}
          <div>
            <h3 className="text-lg font-semibold text-green-400 mb-3">🔍 Diff del Shader</h3>

            <div className="bg-slate-900 p-4 rounded max-h-96 overflow-y-auto font-mono text-xs">
              {shaderCode.diff.length === 0 ? (
                <div className="text-slate-500 text-center">
                  Selecciona un efecto para ver el diff del shader
                </div>
              ) : (
                shaderCode.diff.map((line, index) => (
                  <div
                    key={index}
                    className={`py-1 px-2 rounded ${
                      line.type === 'added' ? 'bg-green-900/30 text-green-300' :
                      line.type === 'removed' ? 'bg-red-900/30 text-red-300' :
                      'text-slate-400'
                    }`}
                  >
                    {line.type === 'added' && '+ '}
                    {line.type === 'removed' && '- '}
                    {line.line}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 text-xs text-slate-400">
              💡 Los cambios en el shader se aplican en tiempo real usando onBeforeCompile
            </div>
          </div>
        </div>

        {/* Consejos Pedagógicos */}
        <div className="mt-6 bg-blue-900/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">🎯 Conceptos de Shader</h4>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• <strong>Glow:</strong> Fresnel effect usando normales y posición de vértice</li>
            <li>• <strong>Dissolve:</strong> Noise function con discard para transparencia</li>
            <li>• <strong>onBeforeCompile:</strong> Hook para modificar shaders dinámicamente</li>
            <li>• <strong>Uniforms:</strong> Variables que puedes cambiar desde JavaScript</li>
            <li>• <strong>Varyings:</strong> Datos que pasan de vertex a fragment shader</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
