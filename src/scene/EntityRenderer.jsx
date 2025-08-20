import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Sphere, Box } from '@react-three/drei';

export default function EntityRenderer({ entities, onEntityClick, selectedEntity }) {
  const groupRef = useRef();

  // Animación sutil para entidades seleccionadas
  useFrame((state) => {
    if (!groupRef.current) return;

    entities.forEach((entity) => {
      const entityMesh = groupRef.current.getObjectByName(`entity-${entity.id}`);
      if (entityMesh && entity.id === selectedEntity) {
        // Efecto de pulso para entidad seleccionada
        const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
        entityMesh.scale.setScalar(scale);
      }
    });
  });

  const handleMeshClick = (entityId, event) => {
    event.stopPropagation();
    onEntityClick(entityId);
  };

  return (
    <group ref={groupRef}>
      {/* Renderizar entidades regulares */}
      {entities.map((entity) => {
        const { transform, renderMesh, color, health } = entity;
        const isSelected = entity.id === selectedEntity;

        // Calcular color basado en salud
        let displayColor = color;
        if (health) {
          const healthRatio = health.current / health.maximum;
          displayColor = {
            r: color.r * healthRatio + (1 - healthRatio),
            g: color.g * healthRatio,
            b: color.b * healthRatio
          };
        }

        // Calcular geometría
        let geometry;
        switch (renderMesh.geometry) {
          case 'sphere':
            geometry = <sphereGeometry args={[renderMesh.radius]} />;
            break;
          case 'cube':
            geometry = <boxGeometry args={[renderMesh.radius * 2, renderMesh.radius * 2, renderMesh.radius * 2]} />;
            break;
          case 'cylinder':
            geometry = <cylinderGeometry args={[renderMesh.radius, renderMesh.radius, renderMesh.radius * 2]} />;
            break;
          default:
            geometry = <sphereGeometry args={[renderMesh.radius]} />;
        }

        return (
          <group
            key={entity.id}
            name={`entity-${entity.id}`}
            position={[transform.position.x, transform.position.y, transform.position.z]}
            rotation={[transform.rotation.x, transform.rotation.y, transform.rotation.z]}
            scale={[transform.scale.x, transform.scale.y, transform.scale.z]}
          >
            {/* Geometría principal */}
            <mesh
              onClick={(event) => handleMeshClick(entity.id, event)}
              castShadow
              receiveShadow
            >
              {geometry}
              <meshStandardMaterial
                color={`rgb(${displayColor.r * 255}, ${displayColor.g * 255}, ${displayColor.b * 255})`}
                transparent={displayColor.a < 1}
                opacity={displayColor.a}
                emissive={isSelected ? '#4444ff' : '#000000'}
                emissiveIntensity={isSelected ? 0.2 : 0}
              />
            </mesh>

            {/* Auras/componentes visuales */}
            {isSelected && (
              <mesh>
                <sphereGeometry args={[renderMesh.radius * 1.2]} />
                <meshBasicMaterial
                  color="#4fc3f7"
                  transparent
                  opacity={0.2}
                  wireframe
                />
              </mesh>
            )}

            {/* Indicadores de componentes */}
            <ComponentIndicators entity={entity} />

            {/* Etiqueta de ID */}
            <Text
              position={[0, renderMesh.radius + 0.5, 0]}
              fontSize={0.2}
              color={isSelected ? "#4fc3f7" : "#ffffff"}
              anchorX="center"
              anchorY="middle"
            >
              #{entity.id}
            </Text>

            {/* Barra de salud si tiene componente Health */}
            {health && (
              <HealthBar health={health} radius={renderMesh.radius} />
            )}
          </group>
        );
      })}

      {/* Renderizar partículas */}
      {entities.map((entity) => {
        const particleSystem = entity.particleSystem;
        if (!particleSystem) return null;

        const particles = particleSystem.getParticles(entity.id);
        return particles.map((particle) => (
          <mesh
            key={particle.id}
            position={[particle.position.x, particle.position.y, particle.position.z]}
            scale={[particle.size, particle.size, particle.size]}
          >
            <sphereGeometry args={[0.5]} />
            <meshStandardMaterial
              color={`rgba(${particle.color.r * 255}, ${particle.color.g * 255}, ${particle.color.b * 255}, ${particle.color.a})`}
              transparent={particle.color.a < 1}
              emissive={`rgba(${particle.color.r * 100}, ${particle.color.g * 100}, ${particle.color.b * 100}, 0.2)`}
            />
          </mesh>
        ));
      })}
    </group>
  );
}

// Componente para mostrar indicadores visuales de componentes
function ComponentIndicators({ entity }) {
  const indicators = [];
  const radius = entity.renderMesh.radius;
  let angle = 0;
  const angleStep = (Math.PI * 2) / Math.max(entity.components.length, 1);

  // Indicadores de componentes activos
  entity.components.forEach((componentType) => {
    const x = Math.cos(angle) * (radius + 0.8);
    const z = Math.sin(angle) * (radius + 0.8);

    let indicatorColor = '#888888';
    let indicatorIcon = '?';

    switch (componentType) {
      case 'Transform':
        indicatorColor = '#4fc3f7';
        indicatorIcon = '📍';
        break;
      case 'Velocity':
        indicatorColor = '#ff9800';
        indicatorIcon = '💨';
        break;
      case 'Color':
        indicatorColor = '#e91e63';
        indicatorIcon = '🎨';
        break;
      case 'Health':
        indicatorColor = '#4caf50';
        indicatorIcon = '❤️';
        break;
      case 'Damage':
        indicatorColor = '#f44336';
        indicatorIcon = '⚔️';
        break;
      case 'Input':
        indicatorColor = '#9c27b0';
        indicatorIcon = '🎮';
        break;
      case 'AI':
        indicatorColor = '#ff5722';
        indicatorIcon = '🤖';
        break;
    }

    indicators.push(
      <Text
        key={`${entity.id}-${componentType}`}
        position={[x, 0, z]}
        fontSize={0.15}
        color={indicatorColor}
        anchorX="center"
        anchorY="middle"
      >
        {indicatorIcon}
      </Text>
    );

    angle += angleStep;
  });

  return indicators;
}

// Componente para mostrar barra de salud
function HealthBar({ health, radius }) {
  const healthRatio = health.current / health.maximum;
  const barWidth = radius * 2;
  const barHeight = 0.1;

  return (
    <group position={[0, radius + 0.3, 0]}>
      {/* Fondo de la barra */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[barWidth, barHeight]} />
        <meshBasicMaterial color="#333333" transparent opacity={0.8} />
      </mesh>

      {/* Barra de salud */}
      <mesh position={[-(barWidth * (1 - healthRatio)) / 2, 0, 0.01]}>
        <planeGeometry args={[barWidth * healthRatio, barHeight]} />
        <meshBasicMaterial
          color={healthRatio > 0.5 ? "#4caf50" : healthRatio > 0.2 ? "#ff9800" : "#f44336"}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Texto de salud */}
      <Text
        position={[0, 0.1, 0]}
        fontSize={0.08}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {Math.round(health.current)}/{health.maximum}
      </Text>
    </group>
  );
}
