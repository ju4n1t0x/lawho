## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)


## Proyecto

Sitio web de LaWho asociacion civil estilo landing page con una seccion interna de blog. 
- Arquitectura:
    El proyecto sera un sitio web que tendra una home con cuatro secciones, mas navbar y footer que sera el path raiz:
        - NavBar
        - Historia
        - Infancias
        - Terreno (seran las miniaturas a las que clickeando se accedera a los posts)
        - Sumate
        - Dona
        - Footer
   Y aparte tendra una seccion interna accesible desde el navBar, donde se podran ver las notas que los usuarios registrados vayan subiendo, los posts se deben renderizar con content collections, que se llamara /operativos-de-salud
   y tendra ademas, un subdominio en donde los usuarios registrados podran autenticarse para poder escribir los posts implementando server islands. 

- Tecnologias:
  - Astro 7.x con `@astrojs/vercel` y Node 26 en desarrollo, CI y Vercel (no Edge). No degradar a Node 24; verificar los metadatos generados y usar el build canónico con el ajuste explícito de compatibilidad del adaptador.
  - TailwindCss
  - PostgreSQL en Neon: conexión agrupada para runtime; conexión directa y credenciales privilegiadas separadas para migraciones.
  - Neon Object Storage compatible con S3: bucket privado `lawhobucket`, carga directa del navegador mediante PUT firmado y validación/optimización en servidor antes de publicar una clave final única.
  - Entrega estable `/media/<key>` con redirección a un GET firmado nuevo; `notes.image_key` nullable y compatibilidad con `image_url`. No persistir URLs firmadas.
  - Docker/VPS/Nginx son referencias opcionales heredadas, no el contrato principal de producción. Conservar sus archivos y las imágenes locales hasta verificar la transición y autorizar su retiro.

## Comandos
- Ejecutar: `<comando>`
- Tests: `pnpm test`
- Lint/formato: `<comando>`

## Estilo y convenciones
<Versión del lenguaje, convenciones de nombres, idioma del código y mensajes.>

Usar Astro 7.x y biblioteca estándar con las excepciones explícitas de `docs/constitution.md`. Quedan autorizados, antes de su instalación, `@astrojs/vercel`, `@aws-sdk/client-s3` y `@aws-sdk/s3-request-presigner`; reutilizar `pg`, `argon2` y `sharp`, sin ORM ni otro sistema de autenticación.
Para las variables utiliza nombre en ingles, pero para mensajes de usuario siempre español


## Reglas
- Lee docs/constitution.md y la spec activa antes de tocar código.
- No añadas dependencias ni cambies el formato del JSON sin actualizar antes la spec.
- No modifiques archivos dentro de `specs/` salvo peticion explicita
- La autorización explícita también es necesaria para editar `openspec/specs/`.
- Ejecutar migraciones con historial/checksums y exclusión de `002` opcional, de forma serializada y **fuera del build**: son un paso manual previo al push que requiere el esquema nuevo; nunca hacer DDL en solicitudes, imports, arranques de funciones ni en el build de Vercel. `MIGRATION_DATABASE_URL` no se configura en Vercel porque no existen variables solo-de-build y las funciones también las leen. Conservar el SQL histórico (`001` ya incluye una nota de ejemplo) y verificar el esquema antes de establecer una línea base existente.
- Crear escritores solo mediante CLI de mantenimiento: entrada segura de contraseña, política vigente y Argon2id; sin registro público, contraseñas en argumentos/logs ni reseteos en cada despliegue. Conservar sesiones compartidas en PostgreSQL, cookies seguras, expiración y logout.
- Conservar Markdown y validación de imágenes JPEG/PNG de hasta 5 MiB. No enviar los bytes en el POST de la nota: Vercel limita el cuerpo a 4.5 MB. Revalidar sesión y propiedad del objeto pendiente; crear una clave final distinta para impedir sobrescrituras con el PUT firmado.
- En reemplazos, guardar en base de datos antes de eliminar el objeto gestionado anterior. No eliminar archivos locales, objetos ajenos ni imágenes por borrado lógico; documentar limpieza segura de pendientes y huérfanos.
- Configuración del runtime mediante `astro:env/server`, sin `dotenv`; scripts independientes pueden usar `process.env` y `process.loadEnvFile()`. Validar los cinco secretos de almacenamiento al usarlo: `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`.
- Aislar ramas, endpoints y credenciales Neon de desarrollo/Preview/producción. Las credenciales de migración no se distribuyen al runtime ni a previews no confiables.

## Al terminar cualquier tarea
- Ejecuta los tests e informa el resultado real. Mantenerlos versionados en `dev` y `main`; permitir dependencias de tests en CI/build, pero excluir tests, fixtures, cobertura y herramientas exclusivas de tests de los estáticos y funciones desplegados. Inspeccionar el resultado del build para comprobarlo.

## Entrega (workflow de ramas)
- El despliegue se hace importando el repositorio desde la web de Vercel: no requiere CLI ni login local de Vercel, y CI no despliega.
- Todos los cambios implementados se pushean PRIMERO a la rama `dev` (rama de integración/estaging).
- `main` solo se toca después de que el maintainer confirme explícitamente que `dev` está estable.
- Nunca pushear directo a `main` sin esa confirmación.
