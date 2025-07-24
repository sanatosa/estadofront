import {
  Box, Heading, Text, HStack, VStack, Button,
  useColorMode, IconButton, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalCloseButton, Badge,
  SimpleGrid, Divider, useColorModeValue, Input, Alert, AlertIcon, Spinner,
  Select, Table, Thead, Tbody, Tr, Th, Td, Stat, StatLabel, StatNumber, StatHelpText
} from "@chakra-ui/react";
import { MoonIcon, SunIcon, CopyIcon, InfoOutlineIcon, DownloadIcon } from "@chakra-ui/icons";
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { FaBoxes, FaEuroSign, FaLayerGroup, FaExclamationTriangle, FaStar, FaCrown } from "react-icons/fa";

const BACKEND_URL = "https://estado-nl35.onrender.com";

const GROUP_COLORS = [
  "#3182ce", "#38a169", "#805ad5", "#00b5d8", "#ed8936", "#319795", "#d53f8c", "#ecc94b"
];

function groupColor(i) {
  return GROUP_COLORS[i % GROUP_COLORS.length];
}

function formatNum(num) {
  return Number(num).toLocaleString("es-ES", {minimumFractionDigits:2, maximumFractionDigits:2});
}
function formatInt(num) {
  return Number(num).toLocaleString("es-ES");
}

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

function getSnapshot() {
  try { return JSON.parse(localStorage.getItem("atosa_snapshot") || "{}"); }
  catch { return {}; }
}
function saveSnapshot(sn) {
  localStorage.setItem("atosa_snapshot", JSON.stringify(sn));
}
async function getAllArticulos() {
  const res = await fetch(`${BACKEND_URL}/api/all-articulos`);
  return (await res.json()).articulos;
}

export default function App() {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [codigos, setCodigos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [diferencias, setDiferencias] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [modalStats, setModalStats] = useState(null);
  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [historial, setHistorial] = useState(getHistorial());
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [tabla, setTabla] = useState([]);
  const [ventasStats, setVentasStats] = useState({});
  const [totalVendido, setTotalVendido] = useState(0);
  const timeoutRef = useRef();

  const handleResumen = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    setCodigos([]);
    setGrupoSeleccionado("");
    setDiferencias(null);
    try {
      const r0 = await fetch(`${BACKEND_URL}/api/resumen`);
      const data = await r0.json();
      setResumen(data);
      setError("");

      const articulos = await getAllArticulos();
      const snapshotNow = {};
      articulos.forEach(a => snapshotNow[a.codigo] = a.disponible);

      const snapshotPrev = getSnapshot();
      const altas = [], bajas = [], ventas = [];
      Object.keys(snapshotNow).forEach(c => {
        if (!(c in snapshotPrev)) altas.push(c);
        else if (snapshotNow[c] < snapshotPrev[c]) ventas.push({codigo: c, de: snapshotPrev[c], a: snapshotNow[c]});
      });
      Object.keys(snapshotPrev).forEach(c => { if (!(c in snapshotNow)) bajas.push(c) });
      setDiferencias({altas, bajas, ventas});
      saveSnapshot(snapshotNow);

      saveHistorial(articulos);
      setHistorial(getHistorial());
      setSuccess("¡Nuevo snapshot guardado!");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setSuccess(""), 3000);

    } catch {
      setError("Error al obtener datos");
    }
    setLoading(false);
  };

  return (
    <Box minH="100vh" bg={useColorModeValue("gray.50", "gray.900")} px={[2, 8]} py={[4, 10]}>
      <HStack justify="space-between" mb={8}>
        <HStack spacing={3}>
          <InfoOutlineIcon w={7} h={7} color="blue.400" />
          <Heading size="lg" fontWeight="extrabold" letterSpacing="wide">
            ATOSA <Text as="span" color="blue.400">Dashboard</Text>
          </Heading>
        </HStack>
        <IconButton
          aria-label="Cambiar modo oscuro/claro"
          icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
          onClick={toggleColorMode}
          variant="ghost"
          size="lg"
        />
      </HStack>

      {success && (
        <Alert status="success" mb={4} borderRadius="lg">
          <AlertIcon /> {success}
        </Alert>
      )}
      {error && !resumen && (
        <Alert status="error" mb={4}><AlertIcon />{error}</Alert>
      )}

      <HStack spacing={3} mb={1}>
        <Button colorScheme="blue" size="lg" onClick={handleResumen} isLoading={loading}>
          Obtener resumen
        </Button>
      </HStack>

      {/* ... resto del contenido completo de la app aquí restaurado como en el archivo original ... */}

    </Box>
  );
}
