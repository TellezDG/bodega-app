import type { Address } from "@solana/kit";

import {
  fetchAllCategoria,
  fetchAllProducto,
  fetchMaybeBodega,
} from "../../clients/js/src/generated";
import { rpc } from "./conexion";
import { pdaBodega } from "./pdas";

export type ProductoUI = {
  direccion: Address;
  codigo: string;
  etiqueta: string;
  stock: number;
  activo: boolean;
};

export type CategoriaUI = {
  direccion: Address;
  idCategoria: number;
  nombre: string;
  totalProductos: number;
  productos: ProductoUI[];
};

export type BodegaUI = {
  direccion: Address;
  owner: Address;
  nombreBodega: string;
  idCounter: number;
  categorias: CategoriaUI[];
};

export async function leerBodega(
  nombreBodega: string,
  owner: Address
): Promise<BodegaUI | null> {
  const direccion = pdaBodega(nombreBodega, owner);
  const cuenta = await fetchMaybeBodega(rpc, direccion);

  if (!cuenta.exists) return null;

  const categorias = cuenta.data.categorias.length
    ? await fetchAllCategoria(rpc, cuenta.data.categorias)
    : [];

  const conProductos = await Promise.all(
    categorias.map(async (cat) => {
      const productos = cat.data.productos.length
        ? await fetchAllProducto(rpc, cat.data.productos)
        : [];
      return {
        direccion: cat.address,
        idCategoria: cat.data.idCategoria,
        nombre: cat.data.nombre,
        totalProductos: cat.data.totalProductos,
        productos: productos.map((prod) => ({
          direccion: prod.address,
          codigo: prod.data.codigo,
          etiqueta: prod.data.etiqueta,
          stock: prod.data.stock,
          activo: prod.data.activo,
        })),
      };
    })
  );

  return {
    direccion,
    owner: cuenta.data.owner,
    nombreBodega: cuenta.data.nombreBodega,
    idCounter: cuenta.data.idCounter,
    categorias: conProductos,
  };
}

export async function siguienteIdCategoria(
  nombreBodega: string,
  owner: Address
): Promise<number> {
  const cuenta = await fetchMaybeBodega(rpc, pdaBodega(nombreBodega, owner));
  if (!cuenta.exists) throw new Error("Esa bodega no existe todavía.");
  if (cuenta.data.categorias.length >= 10) {
    throw new Error("La bodega alcanzó el límite de 10 categorías activas.");
  }
  if (cuenta.data.idCounter >= 65_535) {
    throw new Error("Se agotaron los identificadores u16 de la bodega.");
  }
  return cuenta.data.idCounter + 1;
}
