# swagger-codegen-ts-ui
Web UI for [swagger-codegen-ts](https://github.com/devexperts/swagger-codegen-ts).

## What
This is the (_missing_) web UI for [swagger-codegen-ts](https://github.com/devexperts/swagger-codegen-ts). Actually this is whole codegen app ported to client side, no BE required.

## How to use
Just open https://nedgeva.github.io/swagger-codegen-ts-ui/ and drag-drop your yaml OpenAPI/Swagger spec right to target place. If everything is ok you'll see generated file tree in virtual FS. You're free to inspect each file, export whole output to [CodeSandbox](https://codesandbox.io/) or save locally as zipped archive.

## How to build
Originally swagger-codegen-ts targets NodeJS runtime so it's wasn't planned to run in browser. Therefore shimming of some Node built-ins is required to properly work on client side. At the core of it's dependencies swagger-codegen-ts-ui uses [BrowserFS](https://github.com/rektide/browserfs) which handles requests to Node API like fs, path, process etc, and provides layer to work with it's own virtual FS. Other shims are covered by [Parcel](https://github.com/parcel-bundler/parcel) - the build tool.

Besides shimming, some dependencies requires patching to be able successfuly operate in the browser environment. You can refer to `patches` folder in project dir (*). Patches should be applied automatically by wll-known workaround tool [patch-package](https://github.com/ds300/patch-package) once packages installed, no extra work required.

So building as easy as:
1. cloning this repo
2. running `yarn`
3. and finally `yarn build`

Then check output in `/dist` folder.

(*) client-side app also forces swagger-codegen-ts to use newer version of Prettier by aliasing dependencies and applying little patch to it's internals, so be aware when building against different versions of swagger-codegen-ts.
