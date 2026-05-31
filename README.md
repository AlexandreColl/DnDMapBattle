# DnDMapBattle

Simulador de batallas de DnD sobre mapa digital. Funciona completamente en local, sin servidor ni dependencias — solo abre `index.html` en el navegador.

## Tecnología

- HTML / CSS / JavaScript vanilla (sin frameworks ni librerías externas)
- Canvas API para generación de fichas (tokens) circulares
- CSS Grid para la cuadrícula del mapa
- Drag & Drop nativo (HTML5) para colocar y mover personajes

## Funcionalidades

### Mapa
- Carga una imagen de mapa desde el sistema de archivos
- Se muestra como fondo del área de juego
- Zoom con la rueda del ratón (zoom centrado en el cursor)
- Paneo arrastrando el mapa con el ratón

### Cuadrícula
- Configurable en filas y columnas (por defecto 15×20)
- Se genera sobre el mapa como overlay
- Las celdas tienen bordes semitransparentes

### Personajes / Fichas
- Editor visual de fichas:
  - Carga una imagen (JPG, PNG, etc.)
  - Selecciona **clase** (color de borde predefinido para 13 clases) o color **personalizado**
  - Ajusta **zoom** de la imagen dentro del círculo
  - **Arrastra** la imagen dentro del círculo para encuadrar al personaje
  - Vista previa en vivo
- La ficha generada es un **PNG circular** de 300×300px con borde de color y fondo transparente fuera del círculo
- Las fichas aparecen en el panel lateral y se arrastran al mapa
- Se pueden mover de una celda a otra arrastrándolas
- Botón × para eliminar fichas del mapa o personajes de la lista

### Niebla de guerra (Fog of War)
- Sistema híbrido: visión automática por personaje + revelado manual
- **Visión automática**: cada personaje tiene un radio de visión (configurable al crearlo). Al colocarlo en el mapa, las celdas dentro de su radio se destapan. Al moverlo, se recalculan las celdas visibles.
- **Revelado manual**: clic central (rueda) o Shift+clic en una celda la destapa permanentemente. Otro clic central la vuelve a tapar.
- Las celdas destapadas manualmente no se vuelven a tapar aunque los personajes se alejen.

### Aliados y Enemigos
- En el editor de fichas, marca **"¿Es enemigo?"** para que un personaje **no revele niebla**.
- Los aliados (`[A]`) destapan las casillas dentro de su radio de visión al colocarlos en el mapa.
- Los enemigos (`[E]`) no destapan niebla, ideales para monstruos o PNJ hostiles.

### Exportar / Importar personajes
- **Export personajes**: descarga un archivo `.dndchars` con todos los personajes creados (fichas, clase, visión, aliado/enemigo).
- **Import personajes**: carga un archivo `.dndchars` y añade los personajes a la lista actual.
- Útil para mantener una **biblioteca de personajes** reutilizable entre partidas.

### Guardar / Cargar partida
- **Guardar partida**: descarga un archivo `.dndmap` con todo el estado del juego (mapa, personajes, fichas, niebla, zoom y posición).
- **Cargar partida**: selecciona un archivo `.dndmap` guardado previamente y restaura el estado completo.
- El mapa y las imágenes de personajes se almacenan como data URLs dentro del archivo, por lo que la partida es completamente portátil.

### Controles
| Acción | Ratón |
|--------|-------|
| Zoom | Rueda |
| Paneo | Arrastrar el mapa |
| Colocar personaje | Arrastrar desde sidebar a una celda |
| Mover personaje | Arrastrar ficha a otra celda |
| Destapar celda permanentemente | Clic central o Shift+clic |
| Eliminar ficha | Hover sobre la ficha y clic en × |
| Eliminar personaje | Clic en × en la lista del sidebar |

## Captura
```
+-------------------+--------------------------------------+
|  DnD Battle Map   |                                      |
|                   |                                      |
|  Mapa             |    ╔══════════════════════════════╗   |
|  [Cargar mapa]    |    ║  ██████████████████████████  ║   |
|                   |    ║  ██  👤            ██       ║   |
|  Cuadrícula       |    ║  ██       👤       ██       ║   |
|  Filas: [15]      |    ║  ██                   ██    ║   |
|  Cols: [20]       |    ║  ██████████████████████████  ║   |
|  [Generar]        |    ╚══════════════════════════════╝   |
|                   |                                      |
|  Personajes       |                                      |
|  [Seleccionar img]|                                      |
|  [Nombre]         |                                      |
|  [Añadir]         |                                      |
|  ┌───── Caballero |                                      |
|  ┌───── Mago      |                                      |
|  ┌───── Pícaro    |                                      |
|                   |                                      |
|  [Limpiar todo]   |                                      |
+-------------------+--------------------------------------+
```

## Uso

1. Abre `index.html` en cualquier navegador moderno
2. Carga una imagen de mapa
3. Configura filas/columnas y genera la cuadrícula
4. Añade personajes (imagen + nombre) → se abre el editor de fichas
5. Ajusta clase/color, zoom y encuadre → confirma
6. Arrastra los personajes desde el panel al mapa
7. ¡A jugar!

## Clases y colores predefinidos

| Clase | Color |
|-------|-------|
| Caballero de la Muerte | `#C41E3A` |
| Cazador de Demonios | `#A330C9` |
| Druida | `#FF7C0A` |
| Evocador | `#33937F` |
| Cazador | `#AAD372` |
| Mago | `#3FC7EB` |
| Monje | `#00FF98` |
| Paladín | `#F48CBA` |
| Sacerdote | `#FFFFFF` |
| Pícaro | `#FFF468` |
| Chamán | `#0070DD` |
| Brujo | `#8788EE` |
| Guerrero | `#C69B6D` |

## Estructura del proyecto

```
DnDMapBattle/
├── index.html      # Página principal
├── css/
│   └── styles.css  # Estilos (tema oscuro DnD)
├── js/
│   └── app.js      # Lógica completa de la aplicación
└── README.md
```
