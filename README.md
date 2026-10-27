<a id="readme-top"></a>

[![CI](https://img.shields.io/github/actions/workflow/status/AlexandreColl/DnDMapBattle/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/AlexandreColl/DnDMapBattle/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://img.shields.io/ossf-scorecard/github.com/AlexandreColl/DnDMapBattle?style=for-the-badge&label=OpenSSF%20Scorecard)](https://scorecard.dev/viewer/?uri=github.com/AlexandreColl/DnDMapBattle)
[![License](https://img.shields.io/badge/license-MIT-e94560?style=for-the-badge)](LICENSE)
[![Node](https://img.shields.io/badge/node-24%20LTS-339933?style=for-the-badge)](https://nodejs.org/)
[![PRs](https://img.shields.io/badge/PRs-welcome-3FC7EB?style=for-the-badge)](#contribuir)

<br />
<div align="center">
  <a href="https://github.com/AlexandreColl/DnDMapBattle">
    <img src="public/logo.png" alt="Logo" width="80" height="80">
  </a>
  <h1 align="center">DnD Map Battle</h1>

  <p align="center">
    Simulador de batallas multijugador para Dungeons &amp; Dragons
    <br />
    <a href="#sobre-el-proyecto"><strong>Explorar funcionalidades »</strong></a>
    <br />
    <br />
    <a href="https://github.com/AlexandreColl/DnDMapBattle/issues/new?template=bug_report.yml">Reportar Error</a>
    &middot;
    <a href="https://github.com/AlexandreColl/DnDMapBattle/issues/new?template=feature_request.yml">Solicitar Funcionalidad</a>
  </p>
</div>

<details>
  <summary>Tabla de Contenidos</summary>
  <ol>
    <li>
      <a href="#sobre-el-proyecto">Sobre el Proyecto</a>
      <ul>
        <li><a href="#construido-con">Construido Con</a></li>
      </ul>
    </li>
    <li>
      <a href="#primeros-pasos">Primeros Pasos</a>
      <ul>
        <li><a href="#requisitos">Requisitos</a></li>
        <li><a href="#instalación">Instalación</a></li>
      </ul>
    </li>
    <li><a href="#uso">Uso</a></li>
    <li><a href="#multijugador">Multijugador</a></li>
    <li><a href="#desarrollo">Desarrollo</a></li>
    <li><a href="#contribuir">Contribuir</a></li>
    <li><a href="#licencia">Licencia</a></li>
    <li><a href="#contacto">Contacto</a></li>
  </ol>
</details>

## Sobre el Proyecto

DnD Map Battle es una herramienta digital para Dungeon Masters que permite gestionar batallas tácticas sobre un mapa con cuadrícula. Los personajes se representan como fichas circulares con bordes de color personalizables, y el sistema incluye niebla de guerra con visión por personaje.

Todo funciona en local, sin cuentas ni servidores externos. La sincronización multijugador se realiza en tiempo real a través de WebSocket, permitiendo que el DM y los jugadores compartan la misma vista desde sus dispositivos conectados a la misma red WiFi.

Características principales:

- :joystick: Carga cualquier imagen como mapa y coloca fichas arrastrándolas
- :crossed_swords: Niebla de guerra híbrida: visión automática por personaje, paredes que bloquean la visión y revelado manual
- :hourglass: Iniciativa y control de turnos
- :straight_ruler: Medición de distancias entre casillas
- :floppy_disk: Guardar/cargar partidas y exportar/importar personajes
- :satellite: Sincronización multijugador en tiempo real sin cuentas ni nube

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

### Construido Con

- [![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
- [![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
- [![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Primeros Pasos

### Requisitos

- Node.js 24 (LTS) o superior. Con [nvm](https://github.com/nvm-sh/nvm) o [fnm](https://github.com/Schniz/fnm) basta con `nvm use` / `fnm use`: la versión está en `.nvmrc`
- pnpm 12 (viene con Node a través de Corepack; la versión exacta está fijada en `package.json`)
  ```sh
  corepack enable
  ```

### Instalación

**Sin clonar nada (Windows):** descarga `dndmapbattle-X.Y.Z.zip` de la [última release](https://github.com/AlexandreColl/DnDMapBattle/releases/latest), descomprímelo y haz doble clic en `launcher.bat`. Solo necesitas Node.js 24; las dependencias ya vienen incluidas.

**Desde el código:**

1. Clona el repositorio
   ```sh
   git clone https://github.com/AlexandreColl/DnDMapBattle.git
   cd DnDMapBattle
   ```
2. Instala las dependencias
   ```sh
   pnpm install
   ```
3. Inicia el servidor
   ```sh
   pnpm start
   ```
4. Abre el enlace **Máster** que muestra la consola (`http://localhost:8080/#dm=…`)

En Windows también puedes hacer doble clic en `launcher.bat`: instala las dependencias si faltan, arranca el servidor y abre el navegador ya como máster.

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Uso

La aplicación necesita el servidor en marcha (no funciona abriendo `index.html` directamente).

Hay dos roles: el **máster** prepara la mesa y controla la partida; los **jugadores** ven solo lo que su compañía alcanza a ver (ver [Multijugador](#multijugador)).

El panel lateral del máster tiene dos pestañas: **Preparar** (mapa, cuadrícula, paredes y archivos) y **Partida** (jugadores conectados, turnos y fichas).

1. **Carga un mapa** en _Preparar_: cualquier imagen sirve
2. **Genera la cuadrícula**: configura columnas y filas, o pulsa _Ajustar al mapa_ para obtener celdas cuadradas
3. **Pinta las paredes** con la herramienta de paredes (`W`): bloquean la visión
4. **Añade fichas** en _Partida_ con _Nueva ficha_: el editor convierte tus imágenes en fichas circulares con borde de color
5. **Arrastra las fichas al mapa**: los aliados iluminan el mapa según su radio de visión
6. **Gestiona los turnos**: escribe la iniciativa junto a cada ficha y avanza con `N`

### Herramientas

| Tecla | Herramienta    | Uso                                                       | Quién  |
| ----- | -------------- | --------------------------------------------------------- | ------ |
| `V`   | Mover          | Arrastrar fichas o el mapa; clic en una ficha para editar | Todos  |
| `M`   | Medir          | Clic en dos casillas                                      | Todos  |
| `F`   | Revelar niebla | Clic para revelar u ocultar una casilla                   | Máster |
| `W`   | Paredes        | Arrastrar para pintar; `Mayús` + arrastrar para borrar    | Máster |
| `Esc` | —              | Vuelve a Mover y cierra menús                             | Todos  |

### Otros controles

| Acción                   | Entrada                                        |
| ------------------------ | ---------------------------------------------- |
| Zoom                     | Rueda del ratón, pellizcar o botones `−` / `+` |
| Paneo                    | Arrastrar el fondo, o con dos dedos            |
| Colocar ficha (táctil)   | Mantener pulsada en la lista y arrastrar       |
| Siguiente turno (máster) | `N` o el botón junto al turno actual           |
| Quitar ficha (máster)    | `D` con el ratón encima, o desde su menú       |
| Destapar celda (máster)  | Clic central o `Mayús + clic`                  |
| Centrar a todos (máster) | _Centrar a todos aquí_ en _Partida_            |
| Ocultar panel            | Botón inferior de la barra de herramientas     |

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Multijugador

Conecta tablets y móviles al mismo mapa en tiempo real.

1. Inicia el servidor (`pnpm start` o `launcher.bat`)
2. La consola muestra dos enlaces:
   ```
   Jugadores: http://192.168.1.44:8080
   Máster:    http://localhost:8080/#dm=K7Q2-M9XA
   ```
3. El máster abre su enlace; los jugadores, desde cualquier dispositivo en la misma WiFi, abren el suyo
4. Cada cambio llega al instante a todos, filtrado según el rol

|                                     | Máster                                    | Jugadores                                   |
| ----------------------------------- | ----------------------------------------- | ------------------------------------------- |
| Mapa, cuadrícula, paredes, archivos | ✅                                        | ❌                                          |
| Niebla                              | Semitransparente; puede revelar casillas  | Opaca                                       |
| Fichas aliadas                      | Mover, quitar, iniciativa                 | Mover e iniciativa                          |
| Enemigos                            | Todos                                     | Solo los que la compañía ve, sin iniciativa |
| Turnos                              | Empezar y pasar turno                     | Ver el turno actual                         |
| Zoom y encuadre                     | Propio; puede centrar a todos en su vista | Propio                                      |

El servidor comprueba cada mensaje según el rol y **nunca envía a los jugadores** las fichas ocultas por la niebla ni las paredes, así que no se pueden ver ni desde las herramientas del navegador. La clave de máster cambia en cada arranque; si se pierde el enlace, cópialo de la consola o reinicia el servidor.

> [!NOTE]
> Si el firewall bloquea la conexión, permite el puerto 8080.

> [!WARNING]
> Cualquiera en tu red puede conectarse como jugador, y quien tenga el enlace de máster controla la partida. No lo compartas ni expongas el servidor a Internet.

Variables de entorno opcionales:

| Variable         | Por defecto | Descripción                                             |
| ---------------- | ----------- | ------------------------------------------------------- |
| `PORT`           | `8080`      | Puerto HTTP                                             |
| `HOST`           | `0.0.0.0`   | Interfaz de escucha (`127.0.0.1` = solo local)          |
| `MAX_PAYLOAD_MB` | `16`        | Tamaño máximo de un mensaje (mapas grandes)             |
| `DM_KEY`         | aleatoria   | Clave del enlace de máster (6–64 letras, números o `-`) |

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Desarrollo

| Comando              | Descripción                                                |
| -------------------- | ---------------------------------------------------------- |
| `pnpm dev`           | Servidor con recarga automática                            |
| `pnpm test`          | Tests unitarios y de propiedades (Vitest + fast-check)     |
| `pnpm test:coverage` | Tests unitarios con cobertura (falla si baja del umbral)   |
| `pnpm test:e2e`      | Tests E2E en navegador (Playwright), incluye accesibilidad |
| `pnpm lint`          | ESLint                                                     |
| `pnpm typecheck`     | Comprueba tipos con TypeScript (JSDoc, sin compilar)       |
| `pnpm format`        | Formatea el código con Prettier                            |
| `pnpm check`         | Lint + formato + tipos + tests unitarios                   |
| `pnpm audit`         | Busca vulnerabilidades en las dependencias                 |

Antes del primer `pnpm test:e2e`, descarga el navegador con `pnpm exec playwright install chromium`.

Integración continua (GitHub Actions):

| Workflow       | Cuándo                         | Qué hace                                                                                              |
| -------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| CI             | Push y PR a `main` / `develop` | Lint, formato y tipos; tests unitarios con cobertura; tests E2E; auditoría y revisión de dependencias |
| Formato del PR | Cada PR                        | Título y commits siguen el [formato de commits](#formato-de-commits)                                  |
| CodeQL         | Push, PR y semanal             | Análisis de seguridad del código y de los workflows                                                   |
| Scorecard      | Push a `main` y semanal        | Puntuación [OpenSSF](https://scorecard.dev/) de las prácticas de seguridad del repositorio            |
| Release        | Tag `v*`                       | Publica la release: notas del CHANGELOG, zip listo para usar, SBOM y procedencia firmada              |

Todos los workflows fijan las Actions por SHA, usan permisos mínimos por trabajo, tienen tiempo máximo y registran las conexiones de red con [Harden-Runner](https://github.com/step-security/harden-runner).

### Publicar una versión

1. Crea `release/X.Y.Z` desde `develop`, sube la versión en `package.json` y pon la fecha a la sección en `CHANGELOG.md` (`## [X.Y.Z] - AAAA-MM-DD`)
2. Abre un PR hacia `main` y mergéalo
3. Crea el tag en `main` y súbelo: `git tag -a vX.Y.Z -m "🔖 vX.Y.Z" && git push origin vX.Y.Z`
4. El workflow _Release_ comprueba que el tag coincide con `package.json`, pasa los tests y publica la release con:
   - `dndmapbattle-X.Y.Z.zip`: listo para ejecutar con `launcher.bat`, dependencias incluidas
   - `dndmapbattle-X.Y.Z.cdx.json`: SBOM (CycloneDX) de las dependencias de producción
   - `SHA256SUMS.txt` y [atestaciones](https://github.com/AlexandreColl/DnDMapBattle/attestations) firmadas de procedencia y SBOM
   - `*.intoto.jsonl`: esas atestaciones como bundles de Sigstore, para verificarlas sin conexión
5. Lleva `main` de vuelta a `develop`

Para comprobar que un zip se construyó en este repositorio: `gh attestation verify dndmapbattle-X.Y.Z.zip -R AlexandreColl/DnDMapBattle` (añade `--bundle dndmapbattle-X.Y.Z.zip.intoto.jsonl` para hacerlo sin conexión).

Estructura:

```
public/                 Cliente (servido tal cual, sin build)
  js/main.js            Punto de entrada
  js/lib/               Lógica pura y testeable (visión, geometría, iniciativa, ficheros)
  js/shared/protocol.js Eventos y límites compartidos con el servidor
server/
  index.js              Arranque
  app.js                Express + Socket.IO
  game.js               Estado de la partida y un reducer por evento
  validation.js         Esquemas (zod) de cada mensaje
test/                   Tests de lógica y de servidor
e2e/                    Tests E2E: dos jugadores, táctil y accesibilidad
```

Cada mensaje que llega por WebSocket se valida en el servidor antes de aplicarse y reenviarse; los mensajes no válidos se descartan y se registran en la consola.

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Contribuir

Las contribuciones son bienvenidas. Si tienes una sugerencia, [propón una funcionalidad](https://github.com/AlexandreColl/DnDMapBattle/issues/new?template=feature_request.yml) o envía un pull request. Para problemas de seguridad, sigue la [política de seguridad](SECURITY.md) en lugar de abrir un issue.

1. Haz un fork del proyecto
2. Crea tu rama desde `develop` (`git checkout -b feature/AmazingFeature develop`)
3. Haz commit con el formato de abajo (`git commit -m '✨ feat: add some amazing feature'`)
4. Comprueba que `pnpm check` pasa
5. Haz push y abre un pull request contra `develop`; la plantilla incluye una checklist

### Formato de commits

Un [gitmoji](https://gitmoji.dev/) como carácter Unicode (no `:shortcode:`) seguido de [Conventional Commits](https://www.conventionalcommits.org/es/). Se aplica también a los títulos de los PR:

```
<emoji> tipo(ámbito opcional): descripción corta en imperativo
```

Por ejemplo: `✨ feat(fog): animate fog transitions` o `🔥 chore: remove unused fixtures`.

| Gitmoji | Tipo             | Cuándo                                           |
| ------- | ---------------- | ------------------------------------------------ |
| ✨      | `feat`           | Funcionalidad nueva                              |
| 🐛      | `fix`            | Corrección de un bug                             |
| 🚑️      | `fix`            | Corrección urgente                               |
| 🔒️      | `fix`            | Corrección de seguridad                          |
| 💄      | `style`          | Cambios visuales de la interfaz (CSS, diseño)    |
| 🎨      | `style`          | Formato o estructura del código (Prettier)       |
| ♻️      | `refactor`       | Reorganizar código sin cambiar comportamiento    |
| ⚡️      | `perf`           | Mejora de rendimiento                            |
| ✅      | `test`           | Añadir o corregir tests                          |
| 📝      | `docs`           | Documentación (README, CHANGELOG)                |
| 👷      | `ci`             | Integración continua                             |
| ⬆️      | `build(deps)`    | Actualizar dependencias                          |
| 🔧      | `chore`          | Ficheros de configuración                        |
| 🔥      | `chore`          | Borrar código o ficheros                         |
| 🔖      | `chore(release)` | Preparar una versión                             |
| ⏪️      | `revert`         | Revertir cambios                                 |
| 💥      | `tipo!`          | Cambio incompatible (sube la versión mayor)      |
| 🔀      | —                | Merge: `🔀 Merge branch '<rama>' into <destino>` |

El check _Formato de commits y título_ lo comprueba en cada PR (los commits de merge no se revisan). Para probarlo en local: `PR_TITLE="✨ feat: …" node scripts/check-commit-format.js`.

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Licencia

Distribuido bajo la licencia MIT. Consulta [`LICENSE`](LICENSE) para más información.

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Contacto

Alexandre Coll Molina - [LinkedIn](https://www.linkedin.com/in/alexandre-coll-molina/)

Enlace del proyecto: [https://github.com/AlexandreColl/DnDMapBattle](https://github.com/AlexandreColl/DnDMapBattle)

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>
