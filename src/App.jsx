import { useState } from "react";

const BACKEND_URL = "https://TU-BACKEND.onrender.com"; // Pon tu backend aquí

function App() {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [codigos, setCodigos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("");
  const [error, setError] = useState("");

  const handleResumen = async () => {
    setLoading(true);
    setError("");
    setCodigos([]);
    setGrupoSeleccionado("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/resumen`);
      const data = await res.json();
      setResumen(data);
    } catch (e) {
      setError("Error obteniendo resumen");
    }
    setLoading(false);
  };

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

  return (
    <div style={{ maxWidth: 700, margin: "auto", fontFamily: "Arial" }}>
      <h1>Resumen API ATOSA</h1>
      <button onClick={handleResumen} disabled={loading}>
        {loading ? "Cargando..." : "Obtener resumen"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {resumen && (
        <div>
          <p>
            <b>Total códigos activos:</b> {resumen.total}
          </p>
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
      {grupoSeleccionado && (
        <div style={{ marginTop: 20 }}>
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
