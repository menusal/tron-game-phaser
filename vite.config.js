import { defineConfig } from "vite";
import { resolve } from "path";
import obfuscator from "rollup-plugin-obfuscator";
import { writeFileSync, readFileSync } from "fs";

export default defineConfig({
  base: "./", // Asegura que los assets se carguen correctamente en producción
  build: {
    outDir: "dist", // Directorio de salida para los archivos construidos
    assetsDir: "assets", // Directorio para los assets dentro de outDir
    minify: "terser", // Usa Terser para minificar el código
    sourcemap: false, // Desactiva sourcemaps para producción
    emptyOutDir: false, // Evita que Vite limpie el directorio dist
    rollupOptions: {
      input: resolve(__dirname, "game.js"), // Cambiado a game.js
      output: {
        entryFileNames: "game.[hash].js", // Cambiado a game.[hash].js
        dir: "dist", // Cambiado a dir: 'dist'
      },
      plugins: [
        obfuscator({
          globalOptions: {
            debugProtection: false,
            debugProtectionInterval: false,
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.75,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4,
            identifierNamesGenerator: "hexadecimal",
            rotateStringArray: true,
            selfDefending: true,
            stringArray: true,
            stringArrayEncoding: ["base64"],
            stringArrayThreshold: 0.75,
            transformObjectKeys: true,
            unicodeEscapeSequence: false,
          },
        }),
        {
          name: "update-html",
          writeBundle(options, bundle) {
            const jsFile = Object.keys(bundle).find(
              (filename) =>
                filename.startsWith("game.") && filename.endsWith(".js")
            );
            if (jsFile) {
              const htmlPath = resolve(__dirname, "dist/index.html");
              let htmlContent = readFileSync(htmlPath, "utf-8");

              // Reemplazar la referencia a game.js con el nuevo archivo
              htmlContent = htmlContent.replace(
                /<script src="game\.js"><\/script>/,
                `<script src="${jsFile}"></script>`
              );

              writeFileSync(htmlPath, htmlContent);
            }
          },
        },
      ],
    },
  },
  server: {
    open: true, // Abre el navegador automáticamente al iniciar el servidor de desarrollo
  },
  optimizeDeps: {
    exclude: ["phaser"], // Excluye Phaser de la optimización de dependencias para evitar problemas
  },
});
