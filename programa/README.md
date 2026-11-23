# Programa Anchor `bodega` para Solana Playground

Código fuente del programa on-chain `bodega` con tres niveles de cuentas PDA (`Bodega`, `Categoria` y `Producto`) y regla de cierre condicionado (`CategoriaConProductos`).

- `src/lib.rs`: programa Anchor completo con 6 instrucciones y 5 errores propios.
- `client/client.ts`: cliente de pruebas para ejecutar el flujo completo desde Solana Playground.

## Despliegue rápido en Solana Playground

1. Crea un proyecto Anchor nuevo en [Solana Playground](https://beta.solpg.io/) y selecciona **Devnet**.
2. Pega el contenido de `src/lib.rs` en `src/lib.rs` de Playground (manteniendo `declare_id!("")` o dejando que Playground inyecte tu Program ID al compilar).
3. Ejecuta **Build** y luego **Deploy**.
4. Exporta el `idl.json` y copia el Program ID desplegado.
5. En la raíz de `bodega-app`, enlaza el frontend con:

```bash
npm run configurar:idl -- ./idl.json --program-id TU_PROGRAM_ID
```
