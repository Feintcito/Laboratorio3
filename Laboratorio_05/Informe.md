# Informe de Modelado del Sistema ForensicPro

## 1. Introducción y Contexto

ForensicPro es una solución integral para la investigación y análisis de evidencias digitales en casos de delitos informáticos. El sistema proporciona herramientas especializadas para la adquisición, preservación, análisis y generación de reportes de evidencia digital, manteniendo la integridad y cadena de custodia. Este informe documenta el proceso de modelado del sistema ForensicPro utilizando diversos diagramas UML para representar sus diferentes perspectivas.

El modelado de este sistema se ha abordado desde cuatro perspectivas principales:
- **Contexto**: Visión general del sistema y sus interacciones con entidades externas
- **Interacción**: Comunicación entre los actores y el sistema
- **Estructura**: Organización interna y arquitectura del sistema
- **Comportamiento**: Procesos dinámicos y flujos de trabajo

## 2. Decisiones de Modelado

### 2.1 Modelo de Contexto

**Decisiones clave:**
- Representar el sistema ForensicPro como el elemento central
- Identificar cinco actores/entidades externas principales que interactúan con el sistema:
  - Perito Forense (usuario principal)
  - Investigador (consumidor de reportes)
  - Administrador (gestor del sistema)
  - Fuentes de Datos (dispositivos y sistemas de donde se extrae evidencia)
  - Sistema Judicial (receptor de reportes legales)
- Modelar el Almacenamiento Seguro como un componente crítico para la preservación de la evidencia

El diagrama de contexto proporciona una visión holística del ecosistema en el que opera ForensicPro, destacando la centralidad del sistema y sus interfaces con diversos actores.

### 2.2 Modelo de Interacción

**Decisiones clave:**
- Utilizar un diagrama de casos de uso para representar las funcionalidades principales
- Identificar tres tipos de actores con responsabilidades diferenciadas
- Definir seis casos de uso esenciales que capturan las operaciones fundamentales:
  1. Adquisición de Evidencias
  2. Preservación y Cadena de Custodia
  3. Análisis de Datos
  4. Correlación de Eventos
  5. Generación de Reportes
  6. Gestión de Usuarios y Permisos

Este modelo clarifica cómo los distintos roles interactúan con las funcionalidades del sistema, estableciendo los límites y responsabilidades de cada actor.

### 2.3 Modelo Estructural

**Decisiones clave:**
- Diseñar un diagrama de clases que representa la arquitectura modular del sistema
- Organizar las clases en grupos funcionales:
  - Gestión del sistema (`SistemaForensicPro`, `Usuario`)
  - Gestión de casos (`CasoForense`, `Evidencia`)
  - Procesamiento de datos (`ExtractorDatos`, `Analizador`) 
  - Salidas (`Reporte`)
- Establecer relaciones de composición, asociación y dependencia entre componentes

El diagrama de clases ofrece una visión estática del sistema, mostrando cómo se organizan los diferentes módulos y sus relaciones, reflejando la naturaleza modular mencionada en el caso de estudio.

### 2.4 Modelo de Comportamiento

**Decisiones clave:**
- Utilizar un diagrama de actividad para modelar el flujo de trabajo principal
- Representar el proceso completo desde la autenticación hasta la generación de reportes
- Incorporar procesos paralelos para la adquisición, preservación y verificación
- Incluir puntos de decisión para la autenticación y validación del análisis
- Modelar ciclos de retroalimentación cuando el análisis no está completo

Este diagrama capta la naturaleza dinámica del proceso forense, mostrando la secuencia de actividades y sus interdependencias.

## 3. Análisis y Conclusiones

### 3.1 Aspectos Destacados del Modelado

- **Modularidad y Extensibilidad**: La arquitectura modular identificada (extracción, análisis, correlación, reportes) facilita la incorporación de nuevas funcionalidades y algoritmos.
- **Seguridad y Trazabilidad**: Los procesos de preservación y verificación de integridad están explícitamente modelados para garantizar la cadena de custodia.
- **Colaboración y Acceso**: El modelo contempla diferentes roles y permisos, facilitando la colaboración entre peritos e investigadores.
- **Procesamiento Paralelo**: El diagrama de actividad muestra cómo múltiples tareas pueden ejecutarse en paralelo, optimizando el tiempo de procesamiento.

### 3.2 Desafíos Identificados

- La preservación de la integridad de los datos requiere mecanismos robustos de verificación
- La necesidad de mantener la seguridad sin comprometer la usabilidad para diferentes perfiles de usuario
- La gestión eficiente de grandes volúmenes de datos forenses de fuentes heterogéneas
- La necesidad de escalabilidad para adaptarse a casos de diferente complejidad

### 3.3 Recomendaciones para la Implementación

1. Implementar una arquitectura basada en microservicios que facilite la escalabilidad
2. Utilizar estándares de intercambio de datos forenses para garantizar la interoperabilidad
3. Incorporar mecanismos de firma digital y sellado de tiempo para reforzar la cadena de custodia
4. Desarrollar interfaces adaptadas a los diferentes roles para mejorar la experiencia de usuario
5. Implementar un modelo de aseguramiento de calidad continua mediante pruebas automatizadas

El modelado realizado proporciona una base sólida para la implementación de ForensicPro, capturando sus requisitos funcionales, estructura y comportamiento desde diferentes perspectivas complementarias.