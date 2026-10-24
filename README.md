<a id="readme-top"></a>

[![CI](https://img.shields.io/github/actions/workflow/status/AlexandreColl/DnDMapBattle/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/AlexandreColl/DnDMapBattle/actions/workflows/ci.yml)
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
    <a href="https://github.com/AlexandreColl/DnDMapBattle/issues/new?labels=bug">Reportar Error</a>
    &middot;
    <a href="https://github.com/AlexandreColl/DnDMapBattle/issues/new?labels=enhancement">Solicitar Funcionalidad</a>
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
4. Abre `http://localhost:8080` en el navegador

En Windows también puedes hacer doble clic en `launcher.bat`: instala las dependencias si faltan, arranca el servidor y abre el navegador.

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Uso

La aplicación necesita el servidor en marcha (no funciona abriendo `index.html` directamente).

1. **Carga un mapa**: selecciona cualquier imagen
2. **Genera la cuadrícula**: configura filas y columnas, o pulsa _Ajustar al mapa_ para obtener celdas cuadradas
3. **Añade personajes**: el editor convierte tus imágenes en fichas circulares con borde de color
4. **Arrastra las fichas al mapa**: colócalas en las celdas
5. **Gestiona la niebla**: los aliados destapan el mapa según su radio de visión; las paredes la bloquean

### Controles rápidos

| Acción                      | Entrada                            |
| --------------------------- | ---------------------------------- |
| Zoom                        | Rueda del ratón                    |
| Paneo                       | Arrastrar el fondo                 |
| Colocar personaje           | Arrastrar del panel a una celda    |
| Mover personaje             | Arrastrar la ficha a otra celda    |
| Quitar ficha del mapa       | Clic central sobre la ficha, o `D` |
| Destapar celda (permanente) | Clic central o `Shift + clic`      |
| Ocultar panel               | Botón `◀` en el borde del panel    |

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Multijugador

Conecta tablets y móviles al mismo mapa en tiempo real.

1. Inicia el servidor (`pnpm start`)
2. La consola muestra la IP local:
   ```
   Red local: http://192.168.1.44:8080
   ```
3. Desde cualquier dispositivo en la misma WiFi, abre esa URL
4. Todos los cambios se replican instantáneamente

> [!NOTE]
> Si el firewall bloquea la conexión, permite el puerto 8080.

> [!WARNING]
> El servidor no tiene autenticación: cualquiera en tu red puede conectarse y modificar la partida. No lo expongas a Internet.

Variables de entorno opcionales:

| Variable         | Por defecto | Descripción                                    |
| ---------------- | ----------- | ---------------------------------------------- |
| `PORT`           | `8080`      | Puerto HTTP                                    |
| `HOST`           | `0.0.0.0`   | Interfaz de escucha (`127.0.0.1` = solo local) |
| `MAX_PAYLOAD_MB` | `16`        | Tamaño máximo de un mensaje (mapas grandes)    |

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Desarrollo

| Comando       | Descripción                                |
| ------------- | ------------------------------------------ |
| `pnpm dev`    | Servidor con recarga automática            |
| `pnpm test`   | Tests (Vitest)                             |
| `pnpm lint`   | ESLint                                     |
| `pnpm format` | Formatea el código con Prettier            |
| `pnpm check`  | Lint + formato + tests                     |
| `pnpm audit`  | Busca vulnerabilidades en las dependencias |

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
```

Cada mensaje que llega por WebSocket se valida en el servidor antes de aplicarse y reenviarse; los mensajes no válidos se descartan y se registran en la consola.

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Contribuir

Las contribuciones son bienvenidas. Si tienes una sugerencia, abre un issue con la etiqueta "enhancement" o envía un pull request:

1. Haz un fork del proyecto
2. Crea tu rama desde `develop` (`git checkout -b feature/AmazingFeature develop`)
3. Haz commit siguiendo [Conventional Commits](https://www.conventionalcommits.org/es/) (`git commit -m 'feat: add some amazing feature'`)
4. Comprueba que `pnpm check` pasa
5. Haz push y abre un pull request contra `develop`

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Licencia

Distribuido bajo la licencia MIT. Consulta [`LICENSE`](LICENSE) para más información.

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>

## Contacto

Alexandre Coll Molina - [LinkedIn](https://www.linkedin.com/in/alexandre-coll-molina/)

Enlace del proyecto: [https://github.com/AlexandreColl/DnDMapBattle](https://github.com/AlexandreColl/DnDMapBattle)

<p align="right">(<a href="#readme-top">volver arriba</a>)</p>
