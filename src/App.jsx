import {
  Box, Heading, Text, HStack, VStack, Grid, GridItem, Button,
  useColorMode, IconButton, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalCloseButton, Badge,
  SimpleGrid, Divider, useColorModeValue, Input, Alert, AlertIcon, Spinner
} from "@chakra-ui/react";
import { MoonIcon, SunIcon, CopyIcon, InfoOutlineIcon } from "@chakra-ui/icons";
import { useState } from "react";

const BACKEND_URL = "https://TU-BACKEND.onrender.com"; // pon aquí tu url real

const GROUP_COLORS = [
  "blue.400", "green.400", "purple.400", "cyan.400", "orange.400", "teal.400", "pink.400", "yellow.400"
];

function groupColor(i) {
  return GROUP_COLORS[i % GROUP_COLORS.length];
}

export default function App() {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [codigos, setCodigos] = useState([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("");
  const [error, setError] = useState("");
  const [diferencias, setDiferencias] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const { colorMode, toggleColorMode } = useColorMode();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Para copiar al portapapeles
  function copiarLista() {
    navigator.clipboard.writeText(codigos.join(", "));
  }

  // Local storage para histórico
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

  const handleResumen = async () => {
    setLoading(true); setError(""); setCodigos([]); setGrupoSeleccionado(""); setDiferencias(null);
    try {
      const r0 = await fetch(`${BACKEND_URL}/api/resumen`);
      const data = await r0.json();
      setResumen(data);

      const articulos = await getAllArticulos();
      const snapshotNow = {};
      articulos.forEach(a => snapshotNow[a.codigo] = a.disponible);

      const snapshotPrev = getSnapshot();
      const altas = [], bajas = [], ventas = [];

      Object.keys(snapshotNow).forEach(c => {
        if (!(c in snapshotPrev)) altas.push(c);
        else if (snapshotNow[c] < snapshotPrev[c]) ventas.push({codigo:c, de:snapshotPrev[c], a:snapshotNow[c]});
      });
      Object.keys(snapshotPrev).forEach(c => { if (!(c in snapshotNow)) bajas.push(c) });

      setDiferencias({altas,bajas,ventas});
      saveSnapshot(snapshotNow);
    } catch {
      setError("Error al obtener datos");
    }
    setLoading(false);
  };

  const handleVerCodigos = async grupo => {
    setLoading(true); setCodigos([]); setError(""); setGrupoSeleccionado(grupo);
    try {
      const url = grupo === "SIN_GRUPO"
        ? `${BACKEND_URL}/api/sin-grupo`
        : `${BACKEND_URL}/api/grupo/${encodeURIComponent(grupo)}`;
      const res = await fetch(url);
      const d = await res.json();
      setCodigos(d.sinGrupo || d.codigos || []);
      setBusqueda("");
      onOpen();
    } catch {
      setError("Error al cargar códigos");
    }
    setLoading(false);
  };

  const handleReset = () => {
    localStorage.removeItem("atosa_snapshot");
    setDiferencias(null);
  };

  // Estilos modernos
  const bg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");

  // Filtro de búsqueda en modal
  const codigosFiltrados = codigos.filter(c =>
    !busqueda ? true : c.toString().toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <Box minH="100vh" bg={bg} px={[2, 8]} py={[4, 10]}>
      {/* Header */}
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

      {/* Botones principales */}
      <HStack spacing={3} mb={8}>
        <Button colorScheme="blue" size="lg" onClick={handleResumen} isLoading={loading}>
          Obtener resumen
        </Button>
        <Button variant="outline" onClick={handleReset}>Borrar histórico</Button>
      </HStack>

      {/* Alertas y errores */}
      {error && <Alert status="error" mb={4}><AlertIcon />{error}</Alert>}

      {/* KPI Cards de grupos */}
      {resumen && (
        <VStack align="stretch" spacing={6}>
          <Text fontSize="2xl" fontWeight="bold" color="gray.600" mb={-2}>
            Códigos activos: <Text as="span" color="blue.500">{resumen.total}</Text>
          </Text>
          <SimpleGrid columns={[1, 2, 3]} spacing={5}>
            {Object.entries(resumen.porGrupo).map(([grupo, count], i) => (
              <Box
                key={grupo}
                bg={cardBg}
                p={6}
                rounded="2xl"
                shadow="xl"
                borderLeft="8px solid"
                borderColor={groupColor(i)}
                transition="transform .18s"
                _hover={{ transform: "scale(1.03)", boxShadow: "2xl" }}
                cursor="pointer"
                onClick={() => handleVerCodigos(grupo)}
                position="relative"
              >
                <Text fontWeight="bold" fontSize="lg" color={groupColor(i)} mb={2}>
                  {grupo}
                </Text>
                <Text fontSize="4xl" fontWeight="extrabold">{count}</Text>
                <Badge colorScheme="blue" position="absolute" top={4} right={4}>
                  Ver códigos
                </Badge>
              </Box>
            ))}
            {/* Sin grupo */}
            <Box
              bg={cardBg}
              p={6}
              rounded="2xl"
              shadow="xl"
              borderLeft="8px solid"
              borderColor="red.400"
              transition="transform .18s"
              _hover={{ transform: "scale(1.03)", boxShadow: "2xl" }}
              cursor="pointer"
              onClick={() => handleVerCodigos("SIN_GRUPO")}
              position="relative"
            >
              <Text fontWeight="bold" fontSize="lg" color="red.400" mb={2}>
                Sin grupo
              </Text>
              <Text fontSize="4xl" fontWeight="extrabold">{resumen.sinGrupo}</Text>
              <Badge colorScheme="red" position="absolute" top={4} right={4}>
                Ver códigos
              </Badge>
            </Box>
          </SimpleGrid>
        </VStack>
      )}

      {/* Novedades / Diferencias */}
      {diferencias && (
        <Box bg={cardBg} rounded="xl" shadow="md" mt={10} p={6}>
          <Heading size="md" mb={3}>Novedades desde la última consulta</Heading>
          <SimpleGrid columns={[1,2,3]} spacing={2}>
            <Box>
              <Badge colorScheme="green" mb={2}>Altas</Badge>
              <Text fontSize="lg" fontWeight="bold">{diferencias.altas.length}</Text>
              <Text fontSize="sm">{diferencias.altas.length > 0 ? diferencias.altas.join(", ") : "Ninguna"}</Text>
            </Box>
            <Box>
              <Badge colorScheme="red" mb={2}>Bajas</Badge>
              <Text fontSize="lg" fontWeight="bold">{diferencias.bajas.length}</Text>
              <Text fontSize="sm">{diferencias.bajas.length > 0 ? diferencias.bajas.join(", ") : "Ninguna"}</Text>
            </Box>
            <Box>
              <Badge colorScheme="blue" mb={2}>Ventas (stock bajó)</Badge>
              <Text fontSize="lg" fontWeight="bold">{diferencias.ventas.length}</Text>
              <Text fontSize="sm">
                {diferencias.ventas.length > 0
                  ? diferencias.ventas.map(v=>`${v.codigo} (${v.de}→${v.a})`).join(", ")
                  : "Ninguna"}
              </Text>
            </Box>
          </SimpleGrid>
        </Box>
      )}

      {/* Modal para lista de códigos */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Códigos en {grupoSeleccionado === "SIN_GRUPO" ? "Sin grupo" : grupoSeleccionado}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input
              placeholder="Buscar código..."
              mb={3}
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            <Button leftIcon={<CopyIcon />} size="sm" mb={4} onClick={copiarLista}>
              Copiar lista
            </Button>
            <Divider mb={2} />
            {loading
              ? <Spinner />
              : codigosFiltrados.length
                ? <SimpleGrid columns={[2,3]} spacing={1}>
                    {codigosFiltrados.map(c => (
                      <Badge key={c} colorScheme="teal" fontSize="md" mb={1}>{c}</Badge>
                    ))}
                  </SimpleGrid>
                : <Text color="gray.500">No hay códigos</Text>
            }
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
