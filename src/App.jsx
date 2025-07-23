import {
  Box, Heading, Text, HStack, VStack, Button, useColorMode, IconButton, Alert,
  AlertIcon, Select, Table, Thead, Tbody, Tr, Th, Td, Badge, Spinner
} from "@chakra-ui/react";
import { MoonIcon, SunIcon, DownloadIcon } from "@chakra-ui/icons";
import { useState } from "react";
import * as XLSX from "xlsx";

const BACKEND_URL = "https://estado-nl35.onrender.com"; // pon aquí tu backend real

// =============== GUARDADO Y LECTURA DE HISTORIAL =================
function getHistorial() {
  try { return JSON.parse(localStorage.getItem("atosa_historial") || "[]"); }
  catch { return []; }
}
function saveHistorial(snapshot) {
  const historial = getHistorial();
  historial.push({
    fecha: new Date().toISOString(),
    articulos: snapshot
  });
  localStorage.setItem("atosa_historial", JSON.stringify(historial));
}

// =============== APP PRINCIPAL =================

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [historial, setHistorial] = useState(getHistorial());
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [tabla, setTabla] = useState([]);
  const [totalVendido, setTotalVendido] = useState(0);
  const { colorMode, toggleColorMode } = useColorMode();

  // ====== OBTENER Y GUARDAR SNAPSHOT DE ARTÍCULOS =======
  async function handleGuardarSnapshot() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/all-articulos`);
      const data = await res.json();
      const articulos = Array.isArray(data.articulos) ? data.articulos : [];
      saveHistorial(articulos);
      setHistorial(getHistorial());
      alert("¡Estado guardado correctamente!");
    } catch (e) {
      setError("Error al guardar el snapshot.");
    }
    setLoading(false);
  }

  // ====== COMPARAR ENTRE DOS FECHAS =======
  function handleComparar() {
    if (!fechaInicio || !fechaFin) {
      setError("Selecciona ambas fechas.");
      return;
    }
    setError("");
    const idx1 = historial.findIndex(h => h.fecha === fechaInicio);
    const idx2 = historial.findIndex(h => h.fecha === fechaFin);
    if (idx1 === -1 || idx2 === -1) {
      setError("Error en selección de fechas.");
      return;
    }
    let ini = historial[idx1].articulos;
    let fin = historial[idx2].articulos;

    // Map: codigo -> articulo
    const mapIni = {};
    ini.forEach(a => { mapIni[a.codigo] = a; });
    const mapFin = {};
    fin.forEach(a => { mapFin[a.codigo] = a; });

    // Calcular ventas (stock inicial > stock final)
    const ventas = [];
    let total = 0;

    Object.keys(mapIni).forEach(codigo => {
      const artIni = mapIni[codigo];
      const artFin = mapFin[codigo];
      if (artFin && Number(artIni.disponible) > Number(artFin.disponible)) {
        const cantidad = Number(artIni.disponible) - Number(artFin.disponible);
        const totalVenta = cantidad * Number(artIni.precioVenta || 0);
        total += totalVenta;
        ventas.push({
          codigo,
          descripcion: artIni.descripcion || "",
          grupo: artIni.grupo || "",
          precioVenta: artIni.precioVenta || "",
          stockInicial: artIni.disponible,
          stockFinal: artFin.disponible,
          vendido: cantidad,
          totalVenta: totalVenta.toFixed(2)
        });
      }
    });
    setTabla(ventas);
    setTotalVendido(total.toFixed(2));
  }

  // ====== EXPORTAR A EXCEL =======
  function handleExportarExcel() {
    if (!tabla.length) return;
    const ws = XLSX.utils.json_to_sheet(tabla);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, "ventas.xlsx");
  }

  // ====== RESET HISTORIAL =======
  function handleResetHistorial() {
    localStorage.removeItem("atosa_historial");
    setHistorial([]);
    setTabla([]);
    setFechaInicio("");
    setFechaFin("");
    setTotalVendido(0);
  }

  // ====== FORMATO DE FECHA =======
  function niceDate(fechaIso) {
    const d = new Date(fechaIso);
    return d.toLocaleString("es-ES", { year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  // ====== UI =======
  return (
    <Box minH="100vh" bg={colorMode === "light" ? "gray.50" : "gray.900"} px={[2, 8]} py={[4, 10]}>
      {/* Header */}
      <HStack justify="space-between" mb={8}>
        <Heading>ATOSA <Text as="span" color="blue.400">Dashboard</Text></Heading>
        <IconButton
          aria-label="Cambiar modo oscuro/claro"
          icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
          onClick={toggleColorMode}
          variant="ghost"
          size="lg"
        />
      </HStack>

      {/* Botones y alertas */}
      <HStack spacing={3} mb={5}>
        <Button colorScheme="blue" size="md" onClick={handleGuardarSnapshot} isLoading={loading}>
          Guardar estado actual (snapshot)
        </Button>
        <Button variant="outline" size="md" onClick={handleResetHistorial}>
          Borrar historial
        </Button>
      </HStack>
      {error && <Alert status="error" mb={4}><AlertIcon />{error}</Alert>}

      {/* Historial y selector de fechas */}
      {historial.length > 1 && (
        <Box bg="white" p={4} rounded="xl" shadow="md" mb={6}>
          <HStack spacing={4} align="center">
            <Text>Comparar desde:</Text>
            <Select value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} maxW={52}>
              <option value="">Elige fecha inicio</option>
              {historial.map(h => (
                <option key={h.fecha} value={h.fecha}>{niceDate(h.fecha)}</option>
              ))}
            </Select>
            <Text>hasta:</Text>
            <Select value={fechaFin} onChange={e => setFechaFin(e.target.value)} maxW={52}>
              <option value="">Elige fecha fin</option>
              {historial.map(h => (
                <option key={h.fecha} value={h.fecha}>{niceDate(h.fecha)}</option>
              ))}
            </Select>
            <Button colorScheme="green" onClick={handleComparar}>Comparar ventas</Button>
            <Button leftIcon={<DownloadIcon />} onClick={handleExportarExcel} variant="outline" colorScheme="blue" disabled={!tabla.length}>
              Descargar Excel
            </Button>
          </HStack>
        </Box>
      )}

      {/* Tabla de resultados */}
      {tabla.length > 0 && (
        <Box bg="white" p={4} rounded="xl" shadow="lg">
          <Heading size="md" mb={3}>Ventas entre fechas seleccionadas</Heading>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Código</Th>
                <Th>Descripción</Th>
                <Th>Grupo</Th>
                <Th isNumeric>Precio (€)</Th>
                <Th isNumeric>Stock inicial</Th>
                <Th isNumeric>Stock final</Th>
                <Th isNumeric>Vendido</Th>
                <Th isNumeric>Total vendido (€)</Th>
              </Tr>
            </Thead>
            <Tbody>
              {tabla.map(row => (
                <Tr key={row.codigo}>
                  <Td><Badge colorScheme="blue">{row.codigo}</Badge></Td>
                  <Td>{row.descripcion}</Td>
                  <Td>{row.grupo}</Td>
                  <Td isNumeric>{Number(row.precioVenta).toFixed(2)}</Td>
                  <Td isNumeric>{row.stockInicial}</Td>
                  <Td isNumeric>{row.stockFinal}</Td>
                  <Td isNumeric>{row.vendido}</Td>
                  <Td isNumeric><b>{row.totalVenta}</b></Td>
                </Tr>
              ))}
              <Tr>
                <Td colSpan={7}><b>TOTAL VENDIDO</b></Td>
                <Td isNumeric><b>{Number(totalVendido).toFixed(2)} €</b></Td>
              </Tr>
            </Tbody>
          </Table>
        </Box>
      )}

      {/* Instrucciones iniciales */}
      {historial.length < 2 && (
        <VStack bg="white" mt={8} p={8} rounded="2xl" shadow="xl" align="center">
          <Text fontSize="xl" color="gray.600" textAlign="center">
            Haz clic en <b>“Guardar estado actual”</b> cada vez que quieras registrar el stock.<br />
            Cuando haya <b>dos snapshots o más</b>, podrás comparar ventas entre fechas, analizar por artículo y descargar el informe en Excel.
          </Text>
        </VStack>
      )}
    </Box>
  );
}
