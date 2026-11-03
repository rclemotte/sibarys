import type { Config } from "tailwindcss";

// Sistema de diseño Sibarys: dorado como principal, con negro, gris y blanco.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Principal (se mantiene el nombre "brand" para que lo existente lo herede)
        brand: {
          DEFAULT: "#B08A35", // dorado Sibarys (texto, íconos, bordes)
          dark: "#7E6223",
          light: "#E0AE4C",
          suave: "#F7EFD9",
        },
        tinta: "#2B2627", // texto principal y barra lateral
        suave: "#6E6462", // texto secundario
        tenue: "#A2958F", // texto terciario
        fondo: "#FAF7F2", // fondo cálido
        linea: "#EAE3D7", // separadores y bordes suaves
        oro: { DEFAULT: "#E0AE4C", dark: "#B8923A", suave: "#FBF1DC" },
        ok: { DEFAULT: "#2F8F5B", suave: "#E7F4EC" },
        alerta: { DEFAULT: "#B7791F", suave: "#FDF3DC" },
        error: { DEFAULT: "#C62828", suave: "#FDECEC" }, // alertas que tienen que llamar la atención
        neutro: { DEFAULT: "#6E6462", suave: "#F1ECE4" },
      },
      fontFamily: {
        display: ['"Baloo 2"', "Nunito", "system-ui", "sans-serif"],
        sans: ["Nunito", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      backgroundImage: {
        marca: "linear-gradient(135deg, #C29A3E 0%, #E0AE4C 55%, #EFCB76 100%)",
        oscuro: "linear-gradient(135deg, #1C1819 0%, #2B2627 55%, #463E3F 100%)",
      },
      borderRadius: {
        tarjeta: "24px",
        boton: "16px",
      },
      boxShadow: {
        suave: "0 10px 30px -12px rgba(43, 38, 39, 0.20), 0 2px 6px -2px rgba(43, 38, 39, 0.06)",
        flotante: "0 18px 40px -14px rgba(43, 38, 39, 0.35)",
        boton: "0 10px 22px -10px rgba(176, 138, 53, 0.70)",
      },
      maxWidth: { app: "1150px" },
    },
  },
  plugins: [],
};

export default config;
