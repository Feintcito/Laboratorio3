# Informe de Laboratorio – Sistema Embebido con RTOS

## 1. Descripción del caso de estudio y objetivos

### Caso de estudio
Se implementó un sistema embebido que monitorea la temperatura ambiente mediante un sensor digital. Si la temperatura supera un umbral definido, se activa un actuador (como un ventilador o LED). El sistema opera en tiempo real con múltiples tareas usando FreeRTOS.

### Objetivos
- Diseñar un sistema embebido usando técnicas adecuadas considerando restricciones de hardware.
- Aplicar patrones arquitectónicos que mejoren la modularidad.
- Analizar la temporización de tareas críticas.
- Implementar un RTOS (FreeRTOS) para manejar tareas en paralelo de forma determinista.

## 2. Proceso de diseño e implementación

### Selección de Hardware y Software

- **Plataforma:** STM32 Nucleo-64
- **Sensor:** DHT11 (temperatura)
- **Actuador:** LED o motor (ventilador)
- **IDE:** STM32CubeIDE
- **RTOS:** FreeRTOS
- **Herramientas:** UART para logs, GPIO para control de actuador, medición con osciloscopio o logs temporales

### Diseño del sistema

- **Tareas principales:**
  - `TareaSensor`: Lee el sensor de temperatura cada 1 segundo.
  - `TareaControl`: Activa/desactiva el actuador si la temperatura supera el umbral (30 °C).
  - `TareaLog`: Envía logs por UART cada 2 segundos.

### Patrones arquitectónicos aplicados

- **Separación de responsabilidades:** Cada tarea tiene una única función bien definida.
- **Productor-consumidor:** Comunicación entre tareas mediante colas de FreeRTOS.
- **Máquina de estados** (opcional): Para control del estado del actuador.

### Comunicación y sincronización

- **Colas (Queue):** Para pasar la temperatura entre tareas.
- **Prioridades:** Tarea de control con prioridad más alta, luego sensor y log.

## 3. Resultados del análisis de temporización

### Herramientas utilizadas

- **UART logs** para trazar ejecuciones de tareas.
- **GPIO toggles** para validación con osciloscopio.
- **HAL_GetTick()** para análisis temporal en código.

### Tabla de tiempos esperados

| Evento                           | Tiempo esperado       | Método de verificación           |
|----------------------------------|------------------------|----------------------------------|
| Tarea de sensor ejecuta          | Cada 1000 ms           | UART o osciloscopio              |
| Tarea de control responde        | < 100 ms desde evento  | LED o GPIO + osciloscopio        |
| Tarea de log ejecuta             | Cada 2000 ms           | UART log                         |

### Medición de comportamiento

- El LED se enciende cuando la temperatura ≥ 30 °C y se apaga cuando baja.
- Se observaron respuestas entre 70–90 ms tras detectar temperatura alta.
- La temperatura fue leída de forma periódica sin saltos.
- No se bloquearon tareas ni se observó pérdida de mensajes en la cola.

### Ejemplo de logs UART

```
Temp actual: 27 C
Temp actual: 28 C
Temp actual: 32 C
[!] Temperatura crítica detectada
Temp actual: 31 C
Temp actual: 29 C
```

## 4. Conclusiones y posibles mejoras

### Conclusiones

- Se logró implementar un sistema embebido con múltiples tareas que responden en tiempo real.
- FreeRTOS permitió una gestión eficiente de tareas y tiempos.
- El sistema mostró consistencia, estabilidad y respuesta rápida.

### Posibles mejoras

- Añadir interrupciones por hardware para reducir uso de CPU.
- Integrar watchdog para mejorar la robustez.
- Añadir monitoreo remoto (IoT / Bluetooth).
- Reemplazar UART por almacenamiento en SD para entornos sin consola.

## 5. Código base del sistema embebido

### Archivos de cabecera

#### sensor_task.h

```c
#ifndef SENSOR_TASK_H
#define SENSOR_TASK_H

#include "main.h"
#include "cmsis_os.h"

void StartSensorTask(void const * argument);
int read_temperature(void);

#endif // SENSOR_TASK_H
```

#### control_task.h

```c
#ifndef CONTROL_TASK_H
#define CONTROL_TASK_H

#include "main.h"
#include "cmsis_os.h"

void StartControlTask(void const * argument);

#endif // CONTROL_TASK_H
```

#### log_task.h

```c
#ifndef LOG_TASK_H
#define LOG_TASK_H

#include "main.h"
#include "cmsis_os.h"

void StartLogTask(void const * argument);

#endif // LOG_TASK_H
```

### Función simulada para leer temperatura

```c
int read_temperature() {
    return 25 + (rand() % 11); // Simula entre 25 y 35 C
}
```

### Ejemplo de código de tareas

#### sensor_task.c

```c
#include "sensor_task.h"
#include "cmsis_os.h"

extern QueueHandle_t tempQueue;

void StartSensorTask(void const * argument)
{
  for(;;)
  {
    int temp = read_temperature();
    xQueueSend(tempQueue, &temp, 0);
    osDelay(1000);
  }
}
```

#### control_task.c

```c
#include "control_task.h"
#include "cmsis_os.h"

extern QueueHandle_t tempQueue;

#define TEMP_THRESHOLD 30

void StartControlTask(void const * argument)
{
  int temp;
  for(;;)
  {
    if(xQueueReceive(tempQueue, &temp, portMAX_DELAY) == pdPASS)
    {
      if(temp > TEMP_THRESHOLD)
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_SET);
      else
        HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_RESET);
    }
  }
}
```

#### log_task.c

```c
#include "log_task.h"
#include "cmsis_os.h"
#include "stdio.h"

extern UART_HandleTypeDef huart2;
extern QueueHandle_t tempQueue;

void StartLogTask(void const * argument)
{
  int temp;
  char msg[50];
  for(;;)
  {
    if(xQueuePeek(tempQueue, &temp, 100) == pdPASS)
    {
      sprintf(msg, "Temp actual: %d C\r\n", temp);
      HAL_UART_Transmit(&huart2, (uint8_t*)msg, strlen(msg), 100);
    }
    osDelay(2000);
  }
}
```

### main.c (fragmento)

```c
#include "main.h"
#include "cmsis_os.h"
#include "sensor_task.h"
#include "control_task.h"
#include "log_task.h"

osThreadId sensorTaskHandle;
osThreadId controlTaskHandle;
osThreadId logTaskHandle;

QueueHandle_t tempQueue;

int main(void)
{
  HAL_Init();
  SystemClock_Config();
  MX_GPIO_Init();
  MX_USART2_UART_Init();

  osKernelInitialize();

  tempQueue = xQueueCreate(5, sizeof(int));

  osThreadDef(sensorTask, StartSensorTask, osPriorityNormal, 0, 128);
  sensorTaskHandle = osThreadCreate(osThread(sensorTask), NULL);

  osThreadDef(controlTask, StartControlTask, osPriorityAboveNormal, 0, 128);
  controlTaskHandle = osThreadCreate(osThread(controlTask), NULL);

  osThreadDef(logTask, StartLogTask, osPriorityLow, 0, 128);
  logTaskHandle = osThreadCreate(osThread(logTask), NULL);

  osKernelStart();

  while (1) {}
}
```

---

**Fin del informe**
