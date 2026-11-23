export function texto(valor: string, etiqueta: string, maxBytes: number): string {
  const limpio = valor.trim();
  if (!limpio) throw new Error(etiqueta + ' es obligatorio.');
  if (new TextEncoder().encode(limpio).length > maxBytes) {
    throw new Error(etiqueta + ' admite hasta ' + maxBytes + ' bytes UTF-8.');
  }
  return limpio;
}

export function entero(valor: number, etiqueta: string, minimo: number, maximo: number): number {
  if (!Number.isSafeInteger(valor) || valor < minimo || valor > maximo) {
    throw new Error(etiqueta + ' debe ser un entero entre ' + minimo + ' y ' + maximo + '.');
  }
  return valor;
}

export const bodegaValida = (valor: string) => texto(valor, 'El nombre de la bodega', 30);
export const categoriaValida = (valor: string) => texto(valor, 'El nombre de la categoría', 30);
export const codigoValido = (valor: string) => texto(valor, 'El código de producto', 10);
export const etiquetaValida = (valor: string) => texto(valor, 'La etiqueta del producto', 45);
export const idValido = (valor: number) => entero(valor, 'El ID de categoría', 1, 65_535);
export const stockValido = (valor: number) => entero(valor, 'El stock', 0, 4_294_967_295);
