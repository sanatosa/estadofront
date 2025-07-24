import React, { useState, useEffect } from "react";
import {
  Box, Button, Input, Select, Heading, HStack, Table, Thead, Tbody, Tr, Th, Td, Divider, useToast, Text
} from "@chakra-ui/react";
import * as XLSX from "xlsx";

// -- Helpers de formato --
function formatNum(num) {
  if (num == null) return "-";
  return Number(num).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatInt(num) {
  if (num == null) return "-";
  return Number(num).toLocaleString('es-ES');
}

// -- Leer snapshots del localStorage --
const getInitialSnapshots = () => {
  const local = localStorage.getItem("atosa-snapshots");
  return local ? JSON.parse(local) : [];
};

function App() {
  const toast = useToast();
  const API_URL = import.meta.env.VITE_API_URL || "https://estado-nl35.onrender.com/api/resumen";
  const [resumen, setResumen] = useState(null);
  const [snapshots, setSnapshots] = useState(getInitialSnapshots());
  const [selectedA, setSelectedA] = useState('');
  const [selectedB, setSelectedB] = useState('');

  // Guardar snapshots al localStorage si cambian
  useEffect(() => {
    localStorage.setItem("atosa-snapshots", JSON.stringify(snapshots));
  }, [snapshots]);

  // Obtener resumen desde servidor
  const obtenerResumen = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setResumen(data);
      toast({ status: "success", description: "Resumen actualizado", duration: 2000 });
    } catch (e) {
      toast({ status: "error", description: "Error al obtener resumen", duration: 4000 });
    }
  };

  // Guardar snapshot si es diferente
  const guardarSnapshot = () => {
    if (!resumen) return;
    const nuevoSnap = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      fechaLegible: new Date().toLocaleString('es-ES'),
      datos: resumen
    };
    const last = snapshots[snapshots.length - 1];
    if (!last || JSON.stringify(last.datos) !== JSON.stringify(nuevoSnap.datos)) {
      setSnapshots(s => [...s, nuevoSnap]);
      toast({ status: "success", description: "Nuevo snapshot guardado", duration: 2000 });
    } else {
      toast({ status: "info", description: "El resumen no ha cambiado respecto al último snapshot.", duration: 2000 });
    }
  };

  // Exportar tabla ventas a Excel si tu resumen la incluye
  const exportToExcel = () => {
    if (!(resumen?.ventasTabla?.length)) {
      toast({ status: "info", description: "No hay tabla de ventas para exportar.", duration: 2000 });
      return;
    }
    const ws = XLSX.utils.json_to_sheet(resumen.ventasTabla);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    XLSX.writeFile(wb, "ventas.xlsx");
  };

  // -- Render principal --
  return (
    <Box maxW="1200px" mx="auto" py={8} px={2}>
      <Heading mb={5}>ATOSA Resumen Dashboard</Heading>
      <HStack mb={6} spacing={4}>
        <Button colorScheme="blue" onClick={obtenerResumen}>Obtener Resumen</Button>
        <Button colorScheme="green" onClick={guardarSnapshot} isDisabled={!resumen}>Guardar Snapshot</Button>
        <Button colorScheme="gray" onClick={exportToExcel} isDisabled={!resumen}>Exportar Excel</Button>
      </HStack>

      {resumen && (
        <Box mb={8}>
          <Heading size="md" mb={2}>Resumen actual:</Heading>
          <Table variant="simple" size="sm" mb={4}>
            <Thead>
              <Tr>
                <Th>Grupo</Th>
                <Th>Unidades</Th>
              </Tr>
            </Thead>
            <Tbody>
              {Object.entries(resumen.porGrupo || {}).map(([grupo, cantidad]) => (
                <Tr key={grupo}>
                  <Td>{grupo}</Td>
                  <Td>{cantidad}</Td>
                </Tr>
              ))}
              <Tr>
                <Td><b>TOTAL ARTÍCULOS</b></Td>
                <Td><b>{resumen.total || "-"}</b></Td>
              </Tr>
              <Tr>
                <Td>Sin grupo</Td>
                <Td>{resumen.sinGrupo}</Td>
              </Tr>
            </Tbody>
          </Table>
          {/* Tabla de ventas detallada si existe */}
          {Array.isArray(resumen.ventasTabla) && (
            <Box>
              <Heading size="sm" mt={8}>Ventas detalladas</Heading>
              <Table variant="striped" mt={2}>
                <Thead>
                  <Tr>
                    <Th>Código</Th>
                    <Th>Descripción</Th>
                    <Th>Grupo</Th>
                    <Th>Precio (€)</Th>
                    <Th>Stock inicial</Th>
                    <Th>Stock final</Th>
                    <Th>Vendido</Th>
                    <Th>Total vendido (€)</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {resumen.ventasTabla.map(row => (
                    <Tr key={row.codigo}>
                      <Td>{row.codigo}</Td>
                      <Td>{row.descripcion}</Td>
                      <Td>{row.grupo}</Td>
                      <Td>{formatNum(row.precioVenta)}</Td>
                      <Td>{formatInt(row.stockInicial)}</Td>
                      <Td>{formatInt(row.stockFinal)}</Td>
                      <Td>{formatInt(row.vendido)}</Td>
                      <Td>{formatNum(row.totalVenta)}</Td>
                    </Tr>
                  ))}
                  {resumen.totalVendido !== undefined && (
                    <Tr>
                      <Td colSpan={7}><b>TOTAL VENDIDO</b></Td>
                      <Td><b>{formatNum(resumen.totalVendido)}</b> €</Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>
      )}

      <Divider mt={10} mb={8} />

      {/* Historial de snapshots */}
      <Box>
        <Heading size="md" mb={4}>Historial de snapshots</Heading>
        {snapshots.length === 0 ? (
          <Text color="gray.500">No se ha guardado ningún snapshot aún.</Text>
        ) : (
          <Table size="sm" mb={6}>
            <Thead>
              <Tr>
                <Th>Fecha</Th>
                <Th>Total</Th>
                <Th>Sin grupo</Th>
              </Tr>
            </Thead>
            <Tbody>
              {snapshots.map((s) => (
                <Tr key={s.id}>
                  <Td>{s.fechaLegible}</Td>
                  <Td>{s.datos.total}</Td>
                  <Td>{s.datos.sinGrupo}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}

        {/* Comparador de snapshots */}
        {snapshots.length >= 2 && (
          <Box bg="gray.50" p={4} borderRadius="md">
            <Heading size="sm" mb={2}>Comparar snapshots</Heading>
            <HStack spacing={4} mb={2}>
              <Select placeholder="Snapshot A" value={selectedA} onChange={e => setSelectedA(e.target.value)}>
                {snapshots.map(s => <option key={s.id} value={s.id}>{s.fechaLegible}</option>)}
              </Select>
              <Select placeholder="Snapshot B" value={selectedB} onChange={e => setSelectedB(e.target.value)}>
                {snapshots.map(s => <option key={s.id} value={s.id}>{s.fechaLegible}</option>)}
              </Select>
            </HStack>
            {(selectedA && selectedB && selectedA !== selectedB) && (() => {
              const snapA = snapshots.find(s => String(s.id) === String(selectedA));
              const snapB = snapshots.find(s => String(s.id) === String(selectedB));
              if (!snapA || !snapB) return null;
              const allGroups = Array.from(new Set([
                ...Object.keys(snapA.datos.porGrupo || {}),
                ...Object.keys(snapB.datos.porGrupo || {})
              ]));
              return (
                <Table size="sm" variant="striped" mt={4}>
                  <Thead>
                    <Tr>
                      <Th>Grupo</Th>
                      <Th>{snapA.fechaLegible}</Th>
                      <Th>{snapB.fechaLegible}</Th>
                      <Th>Diferencia</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {allGroups.map(gr => (
                      <Tr key={gr}>
                        <Td>{gr}</Td>
                        <Td>{snapA.datos.porGrupo?.[gr] || 0}</Td>
                        <Td>{snapB.datos.porGrupo?.[gr] || 0}</Td>
                        <Td>{(snapB.datos.porGrupo?.[gr] || 0) - (snapA.datos.porGrupo?.[gr] || 0)}</Td>
                      </Tr>
                    ))}
                    <Tr>
                      <Td><b>Total</b></Td>
                      <Td>{snapA.datos.total}</Td>
                      <Td>{snapB.datos.total}</Td>
                      <Td>{snapB.datos.total - snapA.datos.total}</Td>
                    </Tr>
                    <Tr>
                      <Td><b>Sin grupo</b></Td>
                      <Td>{snapA.datos.sinGrupo}</Td>
                      <Td>{snapB.datos.sinGrupo}</Td>
                      <Td>{snapB.datos.sinGrupo - snapA.datos.sinGrupo}</Td>
                    </Tr>
                  </Tbody>
                </Table>
              );
            })()}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default App;
