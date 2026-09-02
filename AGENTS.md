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
  - Astro
  - TailwindCss
  - PostgreSql
  - filesystem + Nginx para el alojado de todas las imagenes a utilizar en el proyecto 
  - Despliegue con docker en un vps (la base de datos se desplegara en un servicio separado, no formara parte del docker-compose, utilizar variables de entorno)

## Comandos
- Ejecutar: `<comando>`
- Tests: `<comando>`
- Lint/formato: `<comando>`

## Estilo y convenciones
<Versión del lenguaje, convenciones de nombres, idioma del código y mensajes.>

La version de Astro a utilizar sera 7.2 , solo biblioteca estandar (solo suma biblioteca para los test)
Para las variables utiliza nombre en ingles, pero para mensajes de usuario siempre español


## Reglas
- Lee docs/constitution.md y la spec activa antes de tocar código.
- No añadas dependencias ni cambies el formato del JSON sin actualizar antes la spec.
- No modifiques archivos dentro de `specs/` salvo peticion explicita
- <Límites: qué no tocar, qué no añadir sin preguntar.>

## Al terminar cualquier tarea
- Ejecuta los tests y confirma en tu respuesta que todo pasa. 