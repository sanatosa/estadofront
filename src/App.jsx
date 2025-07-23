import { useState } from "react";

const BACKEND_URL = "https://estado-nl35.onrender.com"; // PON TU URL REAL

function App() {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [codigos, setCodigos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("");
  const [error, setError] = useState("");
  const [diferencias, setDiferencias] = useState(null);

  // Leer snapshot anterior desde localStorage
  function getSnapshot() {
    try {
      return JSON.parse(localStorage.getItem("atosa_snapshot") || "{}");
    } catch {
      return {};
    }
  }

  // Guardar snapshot actual en localStorage
  function saveSnapshot(snapshot) {
    localStorage.setItem("atosa_snapshot", JSON.stringify(snapshot));
  }

  // Obtener todos los artículos (para comparar)
  async function getAllCodigosDisponibles() {
    const res = await fetch(`${BACKEND_URL}/api/all-articulos`);
    const data = await res.json();
    return data.articulos || [];
  }

  // Al pulsar el botón, consulta resumen y todos los artículos
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

      // Petición a todos los artículos (para comparar stocks)
      const articulos = await getAllCodigosDisponibles();

      // Snapshot actual: {codigo: disponible}
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
      saveSnapshot(snapshotNow);
    } catch (e) {
      setError("Error obteniendo resumen o todos los artículos");
    }
    setLoading(false);
  };

  // Al hacer click en grupo o sin grupo
  const handleVerCodigos = async (grupo) => {
    setLoading(true);
    setCodigos([]);
    setError("");
    setGrupoSeleccionado(grupo);

    let url;
    if (grupo === "SIN_GRUPO") {
      url = `${BACKEND_URL}/api/sin-grupo`;
    } else {
      url = `${BACKEND_URL}/api/grupo/${encodeURIComponent(grupo)}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      setCodigos(data.sinGrupo || data.codigos || []);
    } catch (e) {
      setError("Error obteniendo códigos del grupo");
    }
    setLoading(false);
  };

  // Para limpiar el histórico
  const handleResetHistorico = () => {
    localStorage.removeItem("atosa_snapshot");
    setDiferencias(null);
  };

  return (
    <div style={{ maxWidth: 800, margin: "auto", fontFamily: "Arial" }}>
      <h1>Resumen API ATOSA</h1>
      <button onClick={handleResumen} disabled={loading}>
        {loading ? "Cargando..." : "Obtener resumen y diferencias"}
      </button>
      <button onClick={handleResetHistorico} style={{ marginLeft: 8 }}>
        Borrar histórico
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {resumen && (
        <div>
          <p><b>Total códigos activos:</b> {resumen.total}</p>
          <ul>
            {Object.entries(resumen.porGrupo).map(([grupo, count]) => (
              <li key={grupo}>
                <button
                  style={{
                    border: "none",
                    background: "none",
                    color: "blue",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                  onClick={() => handleVerCodigos(grupo)}
                  disabled={loading}
                >
                  <b>Grupo {grupo}:</b> {count}
                </button>
              </li>
            ))}
            <li>
              <button
                style={{
                  border: "none",
                  background: "none",
                  color: "blue",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
                onClick={() => handleVerCodigos("SIN_GRUPO")}
                disabled={loading}
              >
                <b>Sin grupo en grupos.xlsx:</b> {resumen.sinGrupo}
              </button>
            </li>
          </ul>
        </div>
      )}
      {diferencias && (
        <div style={{ marginTop: 18, border: "1px solid #ddd", padding: 14, background: "#f8f8f8" }}>
          <h3>Diferencias desde la última consulta:</h3>
          <div><b>Altas (nuevos códigos):</b> {diferencias.altas.length > 0 ? diferencias.altas.join(", ") : "Ninguna"}</div>
          <div><b>Bajas (códigos que han desaparecido):</b> {diferencias.bajas.length > 0 ? diferencias.bajas.join(", ") : "Ninguna"}</div>
          <div>
            <b>Ventas (disponible bajó):</b> {diferencias.ventas.length > 0
              ? diferencias.ventas.map(v => `${v.codigo} (${v.de}→${v.a})`).join(", ")
              : "Ninguna"}
          </div>
        </div>
      )}
      {grupoSeleccionado && (
        <div style={{ marginTop: 24 }}>
          <h3>
            Códigos en{" "}
            {grupoSeleccionado === "SIN_GRUPO"
              ? "Sin grupo"
              : `Grupo ${grupoSeleccionado}`}
            :
          </h3>
          {loading ? (
            <p>Cargando códigos...</p>
          ) : codigos.length === 0 ? (
            <p>No hay códigos.</p>
          ) : (
            <div
              style={{
                maxHeight: 300,
                overflowY: "auto",
                border: "1px solid #ccc",
                padding: 10,
                background: "#f9f9f9",
              }}
            >
              <ul style={{ columns: 2 }}>
                {codigos.map((codigo) => (
                  <li key={codigo}>{codigo}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
