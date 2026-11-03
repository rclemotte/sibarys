import type { Config } from "tailwindcss";

// Sistema de diseño Sibarys: rojo de marca, oscuro, dorado y fondo cálido.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Principal (se mantiene el nombre "brand" para que lo existente lo herede)
        brand: {
          DEFAULT: "#A3222A",
          dark: "#7A1A22",
          light: "#C8343D",
          suave: "#F8E7E6",
        },
        tinta: "#2B2627", // texto principal y barra lateral
        suave: "#6E6462", // texto secundario
        tenue: "#A2958F", // texto terciario
        fondo: "#FAF7F2", // fondo cálido
        linea: "#EAE3D7", // separadores y bordes suaves
        oro: { DEFAULT: "#E0AE4C", dark: "#B8923A", suave: "#FBF1DC" },
        ok: { DEFAULT: "#2F8F5B", suave: "#E7F4EC" },
        alerta: { DEFAULT: "#B7791F", suave: "#FDF3DC" },
        error: { DEFAULT: "#C2410C", suave: "#FDECE4" },
        neutro: { DEFAULT: "#6E6462", suave: "#F1ECE4" },
      },
      fontFamily: {
        display: ['"Baloo 2"', "Nunito", "system-ui", "sans-serif"],
        sans: ["Nunito", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      backgroundImage: {
        marca: "linear-gradient(135deg, #7A1A22 0%, #A3222A 55%, #C8343D 100%)",
      },
      borderRadius: {
        tarjeta: "24px",
        boton: "16px",
      },
      boxShadow: {
        suave: "0 10px 30px -12px rgba(122, 26, 34, 0.18), 0 2px 6px -2px rgba(43, 38, 39, 0.06)",
        flotante: "0 18px 40px -14px rgba(43, 38, 39, 0.35)",
        boton: "0 10px 22px -10px rgba(163, 34, 42, 0.65)",
      },
      maxWidth: { app: "1150px" },
    },
  },
  plugins: [],
};

export default config;
