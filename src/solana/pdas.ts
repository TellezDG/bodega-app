import { address, type Address } from "@solana/kit";
import { PublicKey } from "@solana/web3.js";

import { BODEGA_PROGRAM_ADDRESS } from "../../clients/js/src/generated";
import { s } from "./seeds";

const PROGRAM_ID = new PublicKey(BODEGA_PROGRAM_ADDRESS);

function derivar(semillas: Buffer[]): Address {
  const [pda] = PublicKey.findProgramAddressSync(semillas, PROGRAM_ID);
  return address(pda.toBase58());
}

// Rust: seeds = [b"bodega", nombre_bodega.as_bytes(), owner.key().as_ref()]
export function pdaBodega(nombreBodega: string, owner: Address): Address {
  return derivar([s.texto("bodega"), s.texto(nombreBodega), s.cuenta(owner)]);
}

// Rust: seeds = [b"categoria", bodega.key().as_ref(), id_categoria.to_le_bytes().as_ref()]
export function pdaCategoria(bodega: Address, idCategoria: number): Address {
  return derivar([s.texto("categoria"), s.cuenta(bodega), s.u16(idCategoria)]);
}

// Rust: seeds = [b"producto", categoria.key().as_ref(), codigo.as_bytes()]
export function pdaProducto(categoria: Address, codigo: string): Address {
  return derivar([s.texto("producto"), s.cuenta(categoria), s.texto(codigo)]);
}

export function cadenaCategoria(
  nombreBodega: string,
  owner: Address,
  idCategoria: number
) {
  const bodega = pdaBodega(nombreBodega, owner);
  const categoria = pdaCategoria(bodega, idCategoria);
  return { bodega, categoria };
}

export function cadena(
  nombreBodega: string,
  owner: Address,
  idCategoria: number,
  codigo: string
) {
  const bodega = pdaBodega(nombreBodega, owner);
  const categoria = pdaCategoria(bodega, idCategoria);
  const producto = pdaProducto(categoria, codigo);
  return { bodega, categoria, producto };
}
