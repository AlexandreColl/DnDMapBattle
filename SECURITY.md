# Política de seguridad

## Versiones con soporte

Solo la última versión publicada recibe correcciones de seguridad.

| Versión | Soporte |
| ------- | ------- |
| 1.2.x   | ✅      |
| < 1.2   | ❌      |

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Usa el reporte privado de GitHub:

1. Ve a la pestaña [Security → Advisories](https://github.com/AlexandreColl/DnDMapBattle/security/advisories/new) del repositorio.
2. Pulsa **Report a vulnerability** y describe:
   - qué parte se ve afectada (servidor, cliente, dependencias…),
   - cómo reproducirlo, idealmente con un mensaje de WebSocket o un fichero `.dndmap` de ejemplo,
   - qué impacto tiene (quién puede explotarlo y qué consigue).

Recibirás respuesta en un plazo de 7 días. Si se confirma, se publicará una versión corregida y un aviso de seguridad con el crédito correspondiente, salvo que prefieras quedar en el anonimato.

## Alcance

DnD Map Battle está pensado para **redes locales de confianza**: cualquiera que se conecte entra como jugador, y quien tenga el enlace de máster controla la partida. No hay cuentas ni contraseñas; esto es una decisión de diseño, no una vulnerabilidad.

Sí son vulnerabilidades, por ejemplo:

- Que un jugador consiga permisos de máster sin la clave, o haga algo reservado al máster (mover enemigos, tocar la niebla, las paredes o el mapa).
- Que un jugador reciba información oculta: enemigos bajo la niebla, su iniciativa o las paredes.
- Ejecutar código en el navegador de otro jugador (XSS) mediante nombres, imágenes o ficheros de partida.
- Tumbar o bloquear el servidor con un mensaje WebSocket que la validación debería rechazar.
- Leer ficheros del equipo que ejecuta el servidor fuera de `public/`.
- Dependencias con vulnerabilidades conocidas que afecten a la aplicación.
