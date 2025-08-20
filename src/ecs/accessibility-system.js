import * as THREE from 'three';

/**
 * Sistema de Accesibilidad
 * Implementa modo alto contraste, reducción de movimiento y otras características de accesibilidad
 */
export class AccessibilitySystem {
  constructor() {
    this.name = 'AccessibilitySystem';
    this.requiredComponents = [];
    this.isEnabled = true;

    // Estados de accesibilidad
    this.settings = {
      highContrast: false,
      reducedMotion: false,
      largeText: false,
      focusIndicators: true,
      colorBlindFriendly: false,
      screenReaderOptimized: false,
      audioCues: true,
      keyboardNavigation: true
    };

    // Configuración de perfiles
    this.profiles = {
      default: { ...this.settings },
      highContrast: {
        highContrast: true,
        focusIndicators: true,
        largeText: true
      },
      motorDisability: {
        reducedMotion: true,
        largeText: true,
        keyboardNavigation: true,
        audioCues: true
      },
      visualImpairment: {
        highContrast: true,
        largeText: true,
        audioCues: true,
        screenReaderOptimized: true
      },
      cognitive: {
        reducedMotion: true,
        focusIndicators: true,
        largeText: false,
        audioCues: true
      }
    };

    // Estado del sistema
    this.world = null;
    this.scene = null;
    this.renderer = null;
    this.originalMaterials = new Map();
    this.originalAnimations = new Map();

    // Detectar preferencias del sistema
    this.detectSystemPreferences();
  }

  /**
   * Inicializa el sistema con el mundo ECS
   */
  init(world, scene, renderer) {
    this.world = world;
    this.scene = scene;
    this.renderer = renderer;
    console.log('♿ Accessibility System inicializado');
  }

  /**
   * Detecta preferencias de accesibilidad del sistema
   */
  detectSystemPreferences() {
    // Detectar prefers-reduced-motion
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotionQuery.matches) {
      this.settings.reducedMotion = true;
    }

    // Detectar prefers-contrast
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    if (highContrastQuery.matches) {
      this.settings.highContrast = true;
    }

    // Detectar prefers-color-scheme
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkModeQuery.matches) {
      this.applyDarkMode();
    }

    // Listeners para cambios en preferencias
    reducedMotionQuery.addEventListener('change', (e) => {
      this.settings.reducedMotion = e.matches;
      this.updateAccessibility();
    });

    highContrastQuery.addEventListener('change', (e) => {
      this.settings.highContrast = e.matches;
      this.updateAccessibility();
    });

    console.log('🔍 Preferencias del sistema detectadas:', this.settings);
  }

  /**
   * Actualiza la configuración de accesibilidad
   */
  update(deltaTime) {
    // El sistema se actualiza basado en cambios de configuración
    // No necesita actualización por frame a menos que haya animaciones
  }

  // === MODOS DE ACCESIBILIDAD ===

  /**
   * Activa/desactiva modo alto contraste
   */
  setHighContrast(enabled) {
    this.settings.highContrast = enabled;

    if (enabled) {
      this.applyHighContrast();
    } else {
      this.removeHighContrast();
    }

    this.updateAccessibility();
    console.log(`🎨 Modo alto contraste: ${enabled ? 'Activado' : 'Desactivado'}`);
  }

  /**
   * Aplica modo alto contraste
   */
  applyHighContrast() {
    if (!this.scene) return;

    // Aplicar alto contraste a materiales
    this.scene.traverse((object) => {
      if (object.isMesh && object.material) {
        const material = object.material;

        // Guardar material original
        if (!this.originalMaterials.has(object.id)) {
          this.originalMaterials.set(object.id, material.clone());
        }

        // Aplicar material de alto contraste
        if (material.isMeshStandardMaterial || material.isMeshBasicMaterial) {
          material.color.setHex(0x000000);
          material.emissive.setHex(0xffffff);
          material.emissiveIntensity = 0.2;

          if (material.isMeshStandardMaterial) {
            material.metalness = 0;
            material.roughness = 1;
          }
        }
      }
    });

    // Aplicar estilos CSS de alto contraste
    this.applyHighContrastCSS();

    // Ajustar iluminación para mejor contraste
    this.adjustLightingForContrast();
  }

  /**
   * Remueve modo alto contraste
   */
  removeHighContrast() {
    // Restaurar materiales originales
    this.scene.traverse((object) => {
      if (object.isMesh && this.originalMaterials.has(object.id)) {
        const originalMaterial = this.originalMaterials.get(object.id);
        object.material.copy(originalMaterial);
        this.originalMaterials.delete(object.id);
      }
    });

    // Remover estilos CSS de alto contraste
    this.removeHighContrastCSS();

    // Restaurar iluminación
    this.restoreLighting();
  }

  /**
   * Aplica estilos CSS de alto contraste
   */
  applyHighContrastCSS() {
    const style = document.createElement('style');
    style.id = 'high-contrast-styles';
    style.textContent = `
      * {
        border-color: white !important;
        outline-color: white !important;
      }

      .glass-effect {
        background: rgba(0, 0, 0, 0.95) !important;
        border: 2px solid white !important;
      }

      .btn {
        border: 2px solid white !important;
        color: white !important;
        background: black !important;
      }

      .btn:hover {
        background: white !important;
        color: black !important;
      }

      input, textarea, select {
        border: 2px solid white !important;
        background: black !important;
        color: white !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Remueve estilos CSS de alto contraste
   */
  removeHighContrastCSS() {
    const style = document.getElementById('high-contrast-styles');
    if (style) {
      style.remove();
    }
  }

  /**
   * Ajusta iluminación para alto contraste
   */
  adjustLightingForContrast() {
    if (!this.scene) return;

    const lights = [];
    this.scene.traverse((object) => {
      if (object.isLight) {
        lights.push(object);
      }
    });

    // Aumentar intensidad de luces para mejor contraste
    lights.forEach(light => {
      if (light.intensity !== undefined) {
        light.intensity *= 2;
      }
    });
  }

  /**
   * Restaura iluminación original
   */
  restoreLighting() {
    if (!this.scene) return;

    const lights = [];
    this.scene.traverse((object) => {
      if (object.isLight) {
        lights.push(object);
      }
    });

    // Restaurar intensidad original
    lights.forEach(light => {
      if (light.intensity !== undefined) {
        light.intensity /= 2;
      }
    });
  }

  /**
   * Activa/desactiva reducción de movimiento
   */
  setReducedMotion(enabled) {
    this.settings.reducedMotion = enabled;

    if (enabled) {
      this.applyReducedMotion();
    } else {
      this.removeReducedMotion();
    }

    this.updateAccessibility();
    console.log(`🎭 Reducción de movimiento: ${enabled ? 'Activada' : 'Desactivada'}`);
  }

  /**
   * Aplica reducción de movimiento
   */
  applyReducedMotion() {
    // Detener animaciones de la escena
    this.scene.traverse((object) => {
      if (object.userData.animation) {
        this.originalAnimations.set(object.id, object.userData.animation);
        object.userData.animation.paused = true;
      }
    });

    // Aplicar estilos CSS para reducir movimiento
    const style = document.createElement('style');
    style.id = 'reduced-motion-styles';
    style.textContent = `
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }

      .fade-in {
        animation: none !important;
        opacity: 1 !important;
      }

      .glass-effect {
        transition: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Remueve reducción de movimiento
   */
  removeReducedMotion() {
    // Restaurar animaciones
    this.scene.traverse((object) => {
      if (this.originalAnimations.has(object.id)) {
        const originalAnimation = this.originalAnimations.get(object.id);
        object.userData.animation = originalAnimation;
        object.userData.animation.paused = false;
        this.originalAnimations.delete(object.id);
      }
    });

    // Remover estilos CSS
    const style = document.getElementById('reduced-motion-styles');
    if (style) {
      style.remove();
    }
  }

  /**
   * Aplica modo texto grande
   */
  setLargeText(enabled) {
    this.settings.largeText = enabled;

    const style = document.getElementById('large-text-styles') || document.createElement('style');
    style.id = 'large-text-styles';

    if (enabled) {
      style.textContent = `
        * {
          font-size: 1.2em !important;
        }

        h1, h2, h3, h4, h5, h6 {
          font-size: 1.5em !important;
        }

        button, input, select, textarea {
          font-size: 1.1em !important;
          padding: 8px 12px !important;
        }
      `;
    } else {
      style.textContent = '';
    }

    if (!document.head.contains(style)) {
      document.head.appendChild(style);
    }

    console.log(`📝 Texto grande: ${enabled ? 'Activado' : 'Desactivado'}`);
  }

  /**
   * Aplica indicadores de foco mejorados
   */
  setFocusIndicators(enabled) {
    this.settings.focusIndicators = enabled;

    const style = document.getElementById('focus-indicator-styles') || document.createElement('style');
    style.id = 'focus-indicator-styles';

    if (enabled) {
      style.textContent = `
        *:focus {
          outline: 3px solid #4ade80 !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.3) !important;
        }

        button:focus,
        input:focus,
        select:focus,
        textarea:focus,
        a:focus {
          outline: 4px solid #4ade80 !important;
          outline-offset: 3px !important;
        }
      `;
    } else {
      style.textContent = '';
    }

    if (!document.head.contains(style)) {
      document.head.appendChild(style);
    }
  }

  /**
   * Aplica modo compatible con daltonismo
   */
  setColorBlindFriendly(enabled) {
    this.settings.colorBlindFriendly = enabled;

    // Implementar filtros de postprocesado para diferentes tipos de daltonismo
    // Esto requeriría un sistema de postprocesado más complejo
    console.log(`🌈 Modo daltonismo: ${enabled ? 'Activado' : 'Desactivado'}`);
    console.log('⚠️ Implementación completa requeriría sistema de postprocesado');
  }

  /**
   * Activa un perfil de accesibilidad predefinido
   */
  activateProfile(profileName) {
    if (this.profiles[profileName]) {
      Object.assign(this.settings, this.profiles[profileName]);
      this.updateAccessibility();
      console.log(`👤 Perfil de accesibilidad activado: ${profileName}`);
    } else {
      console.warn(`Perfil no encontrado: ${profileName}`);
    }
  }

  /**
   * Actualiza todos los ajustes de accesibilidad
   */
  updateAccessibility() {
    this.setHighContrast(this.settings.highContrast);
    this.setReducedMotion(this.settings.reducedMotion);
    this.setLargeText(this.settings.largeText);
    this.setFocusIndicators(this.settings.focusIndicators);
    this.setColorBlindFriendly(this.settings.colorBlindFriendly);
  }

  /**
   * Aplica modo oscuro
   */
  applyDarkMode() {
    const style = document.createElement('style');
    style.id = 'dark-mode-styles';
    style.textContent = `
      :root {
        --bg-primary: #000000;
        --bg-secondary: #111111;
        --text-primary: #ffffff;
        --text-secondary: #cccccc;
        --accent: #4ade80;
      }
    `;
    document.head.appendChild(style);
  }

  // === API PÚBLICA ===

  /**
   * Obtiene la configuración actual
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Establece múltiples configuraciones
   */
  setSettings(newSettings) {
    Object.assign(this.settings, newSettings);
    this.updateAccessibility();
  }

  /**
   * Obtiene información de debug
   */
  getDebugInfo() {
    return {
      settings: { ...this.settings },
      profiles: Object.keys(this.profiles),
      originalMaterialsCount: this.originalMaterials.size,
      originalAnimationsCount: this.originalAnimations.size,
      systemPreferences: {
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        highContrast: window.matchMedia('(prefers-contrast: high)').matches,
        darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
      }
    };
  }

  /**
   * Resetea el sistema
   */
  reset() {
    this.removeHighContrast();
    this.removeReducedMotion();
    this.setLargeText(false);
    this.setFocusIndicators(true);
    this.setColorBlindFriendly(false);

    this.originalMaterials.clear();
    this.originalAnimations.clear();

    console.log('🔄 Accessibility System reset');
  }
}
