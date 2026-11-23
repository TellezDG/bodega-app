export function Icono({ tipo }: { tipo: 'conexion' | 'bodega' | 'vacio' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {tipo === 'conexion' ? (
        <>
          <path d="M7 17 17 7M7 7h10v10" />
          <path d="M5 12v7h7" />
        </>
      ) : tipo === 'bodega' ? (
        <>
          <path d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" />
          <path d="M8 21v-7h8v7" />
          <path d="M9 10h6" />
        </>
      ) : (
        <>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M9 12h6" />
        </>
      )}
    </svg>
  );
}
