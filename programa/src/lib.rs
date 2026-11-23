use anchor_lang::prelude::*;

declare_id!("7myWGPTJ86h6VrRmcsYZAFtqRLz4URGooVtWxxGqe5bU");

#[program]
pub mod bodega {
    use super::*;

    /////////////////////////// Crear Bodega ///////////////////////////
    pub fn crear_bodega(context: Context<NuevoBodega>, nombre_bodega: String) -> Result<()> {
        context.accounts.bodega.set_inner(Bodega {
            owner: context.accounts.owner.key(),
            nombre_bodega: nombre_bodega.clone(),
            categorias: Vec::new(),
            id_counter: 0,
        });

        msg!("Bodega '{}' creada exitosamente.", nombre_bodega);

        Ok(())
    }

    /////////////////////////// Crear Categoria ///////////////////////////
    pub fn crear_categoria(context: Context<NuevaCategoria>, nombre: String) -> Result<()> {
        let categoria_key = context.accounts.categoria.key();
        let bodega = &mut context.accounts.bodega;

        require!(bodega.categorias.len() < 10, Errores::LimiteAlcanzado);

        let id_categoria = bodega.id_counter + 1;
        bodega.id_counter = id_categoria;
        bodega.categorias.push(categoria_key);

        context.accounts.categoria.set_inner(Categoria {
            id_categoria,
            nombre: nombre.clone(),
            total_productos: 0,
            productos: Vec::new(),
        });

        msg!("Categoria '{}' creada con id: {}", nombre, id_categoria);

        Ok(())
    }

    /////////////////////////// Registrar Producto ///////////////////////////
    pub fn registrar_producto(
        context: Context<NuevoProducto>,
        _id_categoria: u16,
        codigo: String,
        etiqueta: String,
        stock: u32,
    ) -> Result<()> {
        require!(
            context.accounts.categoria.productos.len() < 10,
            Errores::LimiteAlcanzado
        );

        let producto_key = context.accounts.producto.key();

        context.accounts.producto.set_inner(Producto {
            codigo: codigo.clone(),
            etiqueta,
            stock,
            activo: stock > 0,
        });

        let categoria = &mut context.accounts.categoria;
        categoria.productos.push(producto_key);
        categoria.total_productos += 1;

        msg!(
            "Producto '{}' registrado en categoria id: {} con stock: {}",
            codigo,
            categoria.id_categoria,
            stock
        );

        Ok(())
    }

    /////////////////////////// Actualizar Stock ///////////////////////////
    pub fn actualizar_stock(
        context: Context<ModificarProducto>,
        _id_categoria: u16,
        codigo: String,
        nuevo_stock: u32,
    ) -> Result<()> {
        let producto = &mut context.accounts.producto;
        let stock_anterior = producto.stock;
        producto.stock = nuevo_stock;
        producto.activo = nuevo_stock > 0;

        msg!(
            "Stock del producto '{}' actualizado de {} a {} (activo: {})",
            codigo,
            stock_anterior,
            nuevo_stock,
            producto.activo
        );

        Ok(())
    }

    /////////////////////////// Retirar Producto ///////////////////////////
    pub fn retirar_producto(
        context: Context<EliminarProducto>,
        _id_categoria: u16,
        codigo: String,
    ) -> Result<()> {
        let producto_key = context.accounts.producto.key();
        let categoria = &mut context.accounts.categoria;

        require!(
            categoria.productos.contains(&producto_key),
            Errores::ProductoNoEncontrado
        );

        categoria.productos.retain(|&k| k != producto_key);
        categoria.total_productos -= 1;

        msg!(
            "Producto '{}' retirado de la categoria id: {}",
            codigo,
            categoria.id_categoria
        );

        Ok(())
    }

    /////////////////////////// Cerrar Categoria ///////////////////////////
    pub fn cerrar_categoria(
        context: Context<CerrarCategoria>,
        _id_categoria: u16,
    ) -> Result<()> {
        let categoria_key = context.accounts.categoria.key();
        let id_categoria = context.accounts.categoria.id_categoria;

        require!(
            context.accounts.categoria.productos.is_empty(),
            Errores::CategoriaConProductos
        );

        let bodega = &mut context.accounts.bodega;

        require!(
            bodega.categorias.contains(&categoria_key),
            Errores::CategoriaNoEncontrada
        );

        bodega.categorias.retain(|&k| k != categoria_key);

        msg!("Categoria id: {} cerrada y rent devuelto al owner.", id_categoria);

        Ok(())
    }
}

/////////////////////////// Codigos de Error ///////////////////////////
#[error_code]
pub enum Errores {
    #[msg("Error: no eres el propietario de esta bodega.")]
    NoOwner,
    #[msg("Error: se alcanzo el limite maximo de 10 elementos permitidos.")]
    LimiteAlcanzado,
    #[msg("Error: el producto no figura en el indice de la categoria.")]
    ProductoNoEncontrado,
    #[msg("Error: la categoria no figura en el indice de la bodega.")]
    CategoriaNoEncontrada,
    #[msg("Error: no se puede cerrar una categoria que aun tiene productos registrados.")]
    CategoriaConProductos,
}

/////////////////////////// CUENTAS ///////////////////////////
#[account]
#[derive(InitSpace)]
pub struct Bodega {
    pub owner: Pubkey,

    #[max_len(30)]
    nombre_bodega: String,

    #[max_len(10)]
    categorias: Vec<Pubkey>,

    id_counter: u16,
}

#[account]
#[derive(InitSpace)]
pub struct Categoria {
    id_categoria: u16,

    #[max_len(30)]
    nombre: String,

    total_productos: u16,

    #[max_len(10)]
    productos: Vec<Pubkey>,
}

#[account]
#[derive(InitSpace)]
pub struct Producto {
    #[max_len(10)]
    codigo: String,

    #[max_len(45)]
    etiqueta: String,

    stock: u32,

    activo: bool,
}

/////////////////////////// CONTEXTOS ///////////////////////////
/*
Jerarquia de PDAs:
    bodega    <- [b"bodega",    nombre_bodega, owner]
    categoria <- [b"categoria", bodega,        id_categoria]
    producto  <- [b"producto",  categoria,     codigo]
*/

#[derive(Accounts)]
#[instruction(nombre_bodega: String)]
pub struct NuevoBodega<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = Bodega::INIT_SPACE + 8,
        seeds = [b"bodega", nombre_bodega.as_bytes(), owner.key().as_ref()],
        bump
    )]
    pub bodega: Account<'info, Bodega>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct NuevaCategoria<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, has_one = owner @ Errores::NoOwner)]
    pub bodega: Account<'info, Bodega>,

    #[account(
        init,
        payer = owner,
        space = Categoria::INIT_SPACE + 8,
        seeds = [b"categoria", bodega.key().as_ref(), (bodega.id_counter + 1).to_le_bytes().as_ref()],
        bump
    )]
    pub categoria: Account<'info, Categoria>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id_categoria: u16, codigo: String)]
pub struct NuevoProducto<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(has_one = owner @ Errores::NoOwner)]
    pub bodega: Account<'info, Bodega>,

    #[account(
        mut,
        seeds = [b"categoria", bodega.key().as_ref(), id_categoria.to_le_bytes().as_ref()],
        bump
    )]
    pub categoria: Account<'info, Categoria>,

    #[account(
        init,
        payer = owner,
        space = Producto::INIT_SPACE + 8,
        seeds = [b"producto", categoria.key().as_ref(), codigo.as_bytes()],
        bump
    )]
    pub producto: Account<'info, Producto>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id_categoria: u16, codigo: String)]
pub struct ModificarProducto<'info> {
    pub owner: Signer<'info>,

    #[account(has_one = owner @ Errores::NoOwner)]
    pub bodega: Account<'info, Bodega>,

    #[account(
        seeds = [b"categoria", bodega.key().as_ref(), id_categoria.to_le_bytes().as_ref()],
        bump
    )]
    pub categoria: Account<'info, Categoria>,

    #[account(
        mut,
        seeds = [b"producto", categoria.key().as_ref(), codigo.as_bytes()],
        bump
    )]
    pub producto: Account<'info, Producto>,
}

#[derive(Accounts)]
#[instruction(id_categoria: u16, codigo: String)]
pub struct EliminarProducto<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(has_one = owner @ Errores::NoOwner)]
    pub bodega: Account<'info, Bodega>,

    #[account(
        mut,
        seeds = [b"categoria", bodega.key().as_ref(), id_categoria.to_le_bytes().as_ref()],
        bump
    )]
    pub categoria: Account<'info, Categoria>,

    #[account(
        mut,
        close = owner,
        seeds = [b"producto", categoria.key().as_ref(), codigo.as_bytes()],
        bump
    )]
    pub producto: Account<'info, Producto>,
}

#[derive(Accounts)]
#[instruction(id_categoria: u16)]
pub struct CerrarCategoria<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, has_one = owner @ Errores::NoOwner)]
    pub bodega: Account<'info, Bodega>,

    #[account(
        mut,
        close = owner,
        seeds = [b"categoria", bodega.key().as_ref(), id_categoria.to_le_bytes().as_ref()],
        bump
    )]
    pub categoria: Account<'info, Categoria>,
}
