import { PublicKey } from "@solana/web3.js";

const nombreBodega = "Bodega Norte";
const owner = pg.wallet.publicKey;

console.log("Wallet:", owner.toString());
const balance = await pg.connection.getBalance(owner);
console.log(`Saldo: ${balance / web3.LAMPORTS_PER_SOL} SOL`);

function u16ToBytes(valor: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(valor, 0);
  return buffer;
}

function pdaBodega(nombre: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bodega"), Buffer.from(nombre), owner.toBuffer()],
    pg.PROGRAM_ID
  );
}

function pdaCategoria(bodegaPda: PublicKey, idCategoria: number) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("categoria"), bodegaPda.toBuffer(), u16ToBytes(idCategoria)],
    pg.PROGRAM_ID
  );
}

function pdaProducto(categoriaPda: PublicKey, codigo: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("producto"), categoriaPda.toBuffer(), Buffer.from(codigo)],
    pg.PROGRAM_ID
  );
}

function cadena(nombre: string, idCategoria: number, codigo = "") {
  const [bodega] = pdaBodega(nombre);
  const [categoria] = pdaCategoria(bodega, idCategoria);
  const [producto] = codigo ? pdaProducto(categoria, codigo) : [null];
  return { bodega, categoria, producto };
}

async function siguienteIdCategoria(nombre: string) {
  const [bodegaPda] = pdaBodega(nombre);
  const bodegaAccount = await pg.program.account.bodega.fetch(bodegaPda);
  return bodegaAccount.idCounter + 1;
}

async function crearBodega(nombre: string) {
  const [bodega] = pdaBodega(nombre);
  const txHash = await pg.program.methods
    .crearBodega(nombre)
    .accounts({ owner, bodega })
    .rpc();
  console.log("crearBodega tx:", txHash);
}

async function crearCategoria(nombre: string, nombreCategoria: string) {
  const idCategoria = await siguienteIdCategoria(nombre);
  const { bodega, categoria } = cadena(nombre, idCategoria);
  const txHash = await pg.program.methods
    .crearCategoria(nombreCategoria)
    .accounts({ owner, bodega, categoria })
    .rpc();
  console.log(`crearCategoria #${idCategoria} (${nombreCategoria}) tx:`, txHash);
  return idCategoria;
}

async function registrarProducto(
  nombre: string,
  idCategoria: number,
  codigo: string,
  etiqueta: string,
  stock: number
) {
  const { bodega, categoria, producto } = cadena(nombre, idCategoria, codigo);
  const txHash = await pg.program.methods
    .registrarProducto(idCategoria, codigo, etiqueta, stock)
    .accounts({ owner, bodega, categoria, producto })
    .rpc();
  console.log(`registrarProducto ${codigo} tx:`, txHash);
}

async function actualizarStock(
  nombre: string,
  idCategoria: number,
  codigo: string,
  nuevoStock: number
) {
  const { bodega, categoria, producto } = cadena(nombre, idCategoria, codigo);
  const txHash = await pg.program.methods
    .actualizarStock(idCategoria, codigo, nuevoStock)
    .accounts({ owner, bodega, categoria, producto })
    .rpc();
  console.log(`actualizarStock ${codigo} -> ${nuevoStock} tx:`, txHash);
}

async function retirarProducto(
  nombre: string,
  idCategoria: number,
  codigo: string
) {
  const { bodega, categoria, producto } = cadena(nombre, idCategoria, codigo);
  const txHash = await pg.program.methods
    .retirarProducto(idCategoria, codigo)
    .accounts({ owner, bodega, categoria, producto })
    .rpc();
  console.log(`retirarProducto ${codigo} tx:`, txHash);
}

async function cerrarCategoria(nombre: string, idCategoria: number) {
  const { bodega, categoria } = cadena(nombre, idCategoria);
  const txHash = await pg.program.methods
    .cerrarCategoria(idCategoria)
    .accounts({ owner, bodega, categoria })
    .rpc();
  console.log(`cerrarCategoria #${idCategoria} tx:`, txHash);
}

async function verBodega(nombre: string) {
  const [bodegaPda] = pdaBodega(nombre);
  const bodegaAccount = await pg.program.account.bodega.fetch(bodegaPda);

  console.log("Bodega:", bodegaAccount.nombreBodega);
  console.log("Ultimo id asignado:", bodegaAccount.idCounter);
  console.log("Categorias activas:", bodegaAccount.categorias.length);

  for (const categoriaKey of bodegaAccount.categorias) {
    const cat = await pg.program.account.categoria.fetch(categoriaKey);
    console.log(
      `\nCategoria #${cat.idCategoria}: ${cat.nombre} (${cat.totalProductos} productos) | PDA: ${categoriaKey.toBase58()}`
    );

    for (const productoKey of cat.productos) {
      const prod = await pg.program.account.producto.fetch(productoKey);
      const estado = prod.activo ? "Activo" : "Agotado";
      console.log(
        `  - ${prod.codigo} | ${prod.etiqueta} | stock: ${prod.stock} | ${estado} | PDA: ${productoKey.toBase58()}`
      );
    }
  }
}

// Flujo de prueba en Solana Playground (descomenta paso a paso):
await crearBodega(nombreBodega);
// const id = await crearCategoria(nombreBodega, "Electrico");
// await registrarProducto(nombreBodega, id, "CBL-12", "Cable calibre 12 AWG 100m", 24);
// await actualizarStock(nombreBodega, id, "CBL-12", 0);
// await retirarProducto(nombreBodega, id, "CBL-12");
// await cerrarCategoria(nombreBodega, id);
// await verBodega(nombreBodega);
