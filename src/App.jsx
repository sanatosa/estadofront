import { useState } from "react";

const BACKEND_URL = "https://estado-nl35.onrender.com"; // O la que sea tuya


function App() {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [codigos, setCodigos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("");
  const [error, setError] = useState("");
  const [diferencias, setDiferencias] = useState(null);

  // Lee el snapshot anterior desde localStorage
  function getSnapshot() {
    try {
      return JSON.parse(localStorage.getItem("atosa_snapshot") || "{}");
    } catch {
      return {};
    }
  }

  // Guarda el snapshot en localStorage
  function saveSnapshot(snapshot) {
    localStorage.setItem("atosa_snapshot", JSON.stringify(snapshot));
  }

  // Extrae el listado de códigos y su disponible de la respuesta del backend
  async function getAllCodigosDisponibles() {
    const res = await fetch(`${BACKEND_URL}/api/sin-grupo`);
    const sinGrupo = (await res.json()).sinGrupo || [];
    // También podrías llamar a otro endpoint para todos los artículos, si lo tuvieras.
    // Aquí solo guardamos los códigos sin grupo.
    return sinGrupo;
  }

  // Al pulsar el botón, consulta resumen Y todos los artículos con su disponible
  const handleResumen = async () => {
    setLoading(true);
    setError("");
    setCodigos([]);
    setGrupoSeleccionado("");
    setDiferencias(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/resumen`);
      const data = await res.json();
      setResumen(data);

      // Ahora pide todos los artículos (hacemos la petición directa a la API)
      const resAll = await fetch(`${BACKEND_URL}/api/all-articulos`);
      const articulos = (await resAll.json()).articulos || [];

      // Crea un snapshot actual: {codigo: disponible}
      const snapshotNow = {};
      articulos.forEach(a => {
        snapshotNow[a.codigo] = a.disponible;
      });

      // Compara con snapshot anterior (si existe)
      const snapshotPrev = getSnapshot();

      // Calcular diferencias
      const altas = [];
      const bajas = [];
      const ventas = [];

      Object.keys(snapshotNow).forEach(cod => {
        if (!(cod in snapshotPrev)) altas.push(cod);
        else if (snapshotNow[cod] < snapshotPrev[cod]) ventas.push({ codigo: cod, de: snapshotPrev[cod], a: snapshotNow[cod] });
      });
      Object.keys(snapshotPrev).forEach(cod => {
        if (!(cod in snapshotNow)) bajas.push(cod);
      });

      setDiferencias({ altas, bajas, ventas });
      // Guarda el snapshot actual para la próxima vez
      saveSnapshot(snapshotNow);
    } catch (e) {
      setError("Error obteniendo resumen o todos los artículos");
    }
    setLoading(false);
  };

  // El resto igual que antes (para los grupos)
  // ...

  return (
    <div style={{ maxWidth: 800, margin: "auto", fontFamily: "Arial" }}>
      <h1>Resumen API ATOSA</h1>
      <button onClick={handleResumen} disabled={loading}>
        {loading ? "Cargando..." : "Obtener resumen y diferencias"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {resumen && (
        <div>
          <p><b>Total códigos activos:</b> {resumen.total}</p>
          <ul>
            {Object.entries(resumen.porGrupo).map(([grupo, count]) => (
              <li key={grupo}>
                <b>Grupo {grupo}:</b> {count}
              </li>
            ))}
            <li>
              <b>Sin grupo en grupos.xlsx:</b> {resumen.sinGrupo}</li>
          </ul>
        </div>
      )}
      {diferencias && (
        <div>
          <h3>Diferencias desde la última consulta:</h3>
          <b>Altas (nuevos códigos):</b> {diferencias.altas.length > 0 ? diferencias.altas.join(", ") : "Ninguna"}<br/>
          <b>Bajas (códigos que han desaparecido):</b> {diferencias.bajas.length > 0 ? diferencias.bajas.join(", ") : "Ninguna"}<br/>
          <b>Ventas (disponible bajó):</b> {diferencias.ventas.length > 0
            ? diferencias.ventas.map(v => `${v.codigo} (${v.de}→${v.a})`).join(", ")
            : "Ninguna"}
        </div>
      )}
      {/* Aquí puedes añadir lo de ver los códigos de cada grupo, como en el ejemplo anterior */}
    </div>
  );
}

export default App;
