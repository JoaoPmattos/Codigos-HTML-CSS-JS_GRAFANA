// --- ELEMENTOS DO DOM ---
const rootNode = (typeof htmlGraphics !== 'undefined' && htmlGraphics.htmlNode) ? htmlGraphics.htmlNode : document;
const container = rootNode.querySelector('#neon-topology-panel');
const nodesLayer = container.querySelector('#nodes-layer');
const linesLayer = container.querySelector('#topology-lines');
const breakpointsLayer = container.querySelector('#breakpoints-layer');
const labelsLayer = container.querySelector('#labels-layer');

// --- UI Elements & Variáveis Globais ---
const contextMenu = rootNode.querySelector('#context-menu');
const lineContextMenu = rootNode.querySelector('#line-context-menu');
const breakpointContextMenu = rootNode.querySelector('#breakpoint-context-menu');
const connectionMsg = rootNode.querySelector('#connection-mode-msg');
const saveBtn = rootNode.querySelector('#save-layout-btn');

// NOVOS ELEMENTOS DA UI DE LINHA
const inputLineColor = rootNode.querySelector('#ctx-line-color');
const inputLineAnimate = rootNode.querySelector('#ctx-line-animate');

// Variáveis de Controle
let activeNodeContext = null;
let activeLineContext = null;
let activeBreakpointContext = null;
let bindTargetSlot = 'primary';
let lastRightClickPos = { x: 0, y: 0 };
let connectionSourceNode = null;
let draggedNode = null;
let resizingNode = null;
let draggedBreakpoint = null;
let draggedLabel = null;
let startResizeX, startResizeY, startWidth, startHeight;

// Botões do Menu
const btnBindData = rootNode.querySelector('#ctx-bind-data');
const btnConnect = rootNode.querySelector('#ctx-connect');
const btnResize = rootNode.querySelector('#ctx-resize');
const btnIcon = rootNode.querySelector('#ctx-icon');
const btnRename = rootNode.querySelector('#ctx-rename');
const btnDuplicate = rootNode.querySelector('#ctx-duplicate');
const btnDelete = rootNode.querySelector('#ctx-delete');

// Botões de Linha
const btnBindLineData = rootNode.querySelector('#ctx-bind-line-data');
const btnBindLineDataSec = rootNode.querySelector('#ctx-bind-line-data-sec');
const btnToggleP2P = rootNode.querySelector('#ctx-toggle-p2p');
const btnAddBreakpoint = rootNode.querySelector('#ctx-add-breakpoint');
const btnDeleteLine = rootNode.querySelector('#ctx-delete-line');
const btnRemoveBreakpoint = rootNode.querySelector('#ctx-remove-breakpoint');

// Modals
const connDetailsModal = rootNode.querySelector('#connection-details-modal');
const connRoute = rootNode.querySelector('#conn-route');
const connMetricName = rootNode.querySelector('#conn-metric-name');
const connMetricValue = rootNode.querySelector('#conn-metric-value');
const closeConnDetailsBtn = rootNode.querySelector('#close-conn-details-btn');
const exportModal = rootNode.querySelector('#export-modal');
const exportArea = rootNode.querySelector('#export-area');
const copyBtn = rootNode.querySelector('#copy-btn');
const closeBtn = rootNode.querySelector('#close-modal-btn');
const iconModal = rootNode.querySelector('#icon-modal');
const iconGrid = rootNode.querySelector('#icon-grid');
const closeIconModalBtn = rootNode.querySelector('#close-icon-modal-btn');
const dataModal = rootNode.querySelector('#data-modal');
const dataList = rootNode.querySelector('#data-list');
const closeDataModalBtn = rootNode.querySelector('#close-data-modal-btn');
const dataSearchInput = rootNode.querySelector('#data-search-input');

if (closeConnDetailsBtn) closeConnDetailsBtn.onclick = () => connDetailsModal.classList.add('modal-hidden');

// --- LISTA DE ÍCONES DISPONÍVEIS ---
const availableIcons = [
    { name: 'Switch', class: 'fa-network-wired' },
    { name: 'Roteador', class: 'fa-route' },
    { name: 'Servidor', class: 'fa-server' },
    { name: 'Banco de Dados', class: 'fa-database' },
    { name: 'Wifi / AP', class: 'fa-wifi' },
    { name: 'Firewall', class: 'fa-shield-halved' },
    { name: 'Nuvem', class: 'fa-cloud' },
    { name: 'PC / Laptop', class: 'fa-laptop' },
    { name: 'Usuário', class: 'fa-user' },
    { name: 'Prédio', class: 'fa-building' },
    { name: 'Torre', class: 'fa-broadcast-tower' },
    { name: 'Cadeado', class: 'fa-lock' },
    { name: 'Impressora', class: 'fa-print' }

];

// --- FUNÇÃO PARA ABRIR DETALHES ---
function openConnectionDetails(link) {
    if (!link.metricBind) {
        alert("Nenhum dado vinculado a esta conexão.");
        return;
    }
    const metricList = getMetricData();
    const metric = metricList.find(m => m.name === link.metricBind);
    if (metric) {
        connRoute.innerHTML = `${link.src} <i class="fa fa-arrow-right" style="color:#fbbf24; margin:0 5px;"></i> ${link.dst}`;
        connMetricName.innerText = metric.name;
        const formattedVal = getFormattedValue(metric.name, metric.value);
        connMetricValue.innerText = formattedVal;
        connMetricValue.className = '';
        let isGood = true;
        if (metric.name.includes('status') || metric.name.includes('ping') || metric.name.includes('ICMP')) {
            isGood = isStatusOnline(metric.value);
        }
        connMetricValue.classList.add(isGood ? 'val-display-on' : 'val-display-off');
        closeAllMenus();
        connDetailsModal.classList.remove('modal-hidden');
    } else {
        alert("Dado não encontrado na lista atual do Grafana.");
    }
}

// --- FUNÇÕES DE CRIAÇÃO (PRESETS) ---
window.addNodePreset = function (type) {
    let icon = 'fa-server'; let nodeType = 'forti'; let baseId = 'Node';
    if (type === 'router') { icon = 'fa-route'; nodeType = 'forti'; baseId = 'Roteador'; }
    if (type === 'switch') { icon = 'fa-network-wired'; nodeType = 'fortiswitch'; baseId = 'Switch'; }
    if (type === 'server') { icon = 'fa-server'; nodeType = 'zabbix'; baseId = 'Server'; }
    if (type === 'cloud') { icon = 'fa-cloud'; nodeType = 'forti'; baseId = 'Nuvem'; }
    let newId = baseId; let c = 1; while (nodes.find(n => n.id === newId)) { newId = baseId + '-' + c++; }
    nodes.push({ id: newId, x: 50, y: 50, type: nodeType, icon: icon });
    reRenderAll();
};

window.addCustomNode = function () {
    const name = prompt("Nome do dispositivo:", "Novo-Item");
    if (!name) return;
    let newId = name; let c = 1; while (nodes.find(n => n.id === newId)) { newId = name + '-' + c++; }
    nodes.push({ id: newId, x: 50, y: 50, type: 'forti', icon: 'fa-square' });
    reRenderAll();
};

// --- DADOS ---
const mockGrafanaData = [{ name: "SW01-AGROMAVE: ICMP ping", value: 1 }, { name: "SW03-LINK-OFFLINE: ICMP ping", value: 0 }];
function getMetricData() {
    let metrics = [];
    if (typeof htmlGraphics !== 'undefined' && htmlGraphics.data) {
        const data = htmlGraphics.data;
        if (data.series) {
            data.series.forEach(s => {
                const fieldVal = s.fields.find(f => f.type === 'number');
                const fieldName = s.fields.find(f => f.name === 'Metric' || f.name === 'Field' || f.type === 'string');
                if (fieldVal && fieldName) {
                    for (let i = 0; i < fieldVal.values.length; i++) {
                        metrics.push({ name: fieldName.values.get(i), value: fieldVal.values.get(i) });
                    }
                } else if (s.name && fieldVal) {
                    const lastVal = fieldVal.values.get(fieldVal.values.length - 1);
                    metrics.push({ name: s.name, value: lastVal });
                }
            });
        }
    }
    if (metrics.length === 0) return mockGrafanaData;
    return metrics;
}
function isStatusOnline(val) { const v = parseInt(val, 10); return v === 1; }
function formatTraffic(value) { if (value === null || value === undefined || value === '') return 'N/A'; let num = parseFloat(value); if (isNaN(num)) return value; const units = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps']; let u = 0; while (num >= 1000 && u < units.length - 1) { num /= 1000; u++; } return num.toFixed(2) + ' ' + units[u]; }
function getFormattedValue(name, value) { if (name.includes('Bits received') || name.includes('Bits sent')) return formatTraffic(value); if (name.includes('status') || name.includes('ping') || name.includes('ICMP')) return isStatusOnline(value) ? "Online" : "Offline"; return value; }

// =====================================================================================
// 🔴🔴🔴 ÁREA DE DADOS (INICIO) - COLE SEU JSON ABAIXO DESTA LINHA 🔴🔴🔴
// =====================================================================================

// COPIE E SUBSTITUA AS LISTAS NO CÓDIGO JS:
let nodes = [
    {
        "id": "IMP-SAO-ESCRITORIO\r\nGi1/0/12",
        "x": 3.5,
        "y": 41.39,
        "type": "zabbix",
        "width": 96,
        "height": 40,
        "icon": "fa-print",
        "metricBind": "PGC-MPLS-6730: ICMP ping"
    },
    {
        "id": "sw-biomm-SP-01\r\nDell N1548",
        "x": 9.97,
        "y": 41.27,
        "type": "forti",
        "width": 74,
        "height": 40
    },
    {
        "id": "PowerEdgeT420",
        "x": 3.67,
        "y": 29.01,
        "type": "fortiswitch",
        "icon": "fa-laptop"
    },
    {
        "id": "11-AP-SAO-SALA-REUNIAO\r\nIT Gi1/0/42",
        "x": 3.56,
        "y": 53.19,
        "type": "fortiswitch",
        "width": 78,
        "height": 58,
        "icon": "fa-wifi"
    },
    {
        "id": "13-AP-SAO-SALA-HERALDO\r\nIT Gi1/0/44",
        "x": 3.5,
        "y": 76.14,
        "type": "fortiswitch",
        "width": 50,
        "height": 58,
        "icon": "fa-wifi"
    },
    {
        "id": "12-AP-SAO-ESCRITORIO-ADM\r\nIT Gi1/0/45",
        "x": 3.45,
        "y": 64.98,
        "type": "fortiswitch",
        "width": 77,
        "height": 52,
        "icon": "fa-wifi"
    },
    {
        "id": "Sonicwall TZ 470",
        "x": 16.23,
        "y": 41.27,
        "type": "fortiswitch",
        "icon": "fa-shield-halved"
    },
    {
        "id": "Vivo",
        "x": 15.96,
        "y": 28.07,
        "type": "fortiswitch",
        "icon": "fa-route"
    },
    {
        "id": "Tellium",
        "x": 16.17,
        "y": 53.66,
        "type": "fortiswitch",
        "icon": "fa-route"
    },
    {
        "id": "Nuvem",
        "x": 22.64,
        "y": 41.13,
        "type": "forti",
        "icon": "fa-cloud"
    },
    {
        "id": "Kater",
        "x": 20.22,
        "y": 67.22,
        "type": "fortiswitch",
        "icon": "fa-route"
    },
    {
        "id": "Algar",
        "x": 22.64,
        "y": 19.48,
        "type": "fortiswitch",
        "icon": "fa-route"
    },
    {
        "id": "ATC",
        "x": 22.64,
        "y": 57.43,
        "type": "fortiswitch",
        "icon": "fa-route"
    },
    {
        "id": "Sonicwall TZ 670",
        "x": 29.33,
        "y": 41.13,
        "type": "fortiswitch",
        "icon": "fa-shield-halved"
    },
    {
        "id": "PowerEdge R760",
        "x": 29.22,
        "y": 11.58,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "Storage SC2020",
        "x": 30.67,
        "y": 19.7,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "PowerEdge R660",
        "x": 35.69,
        "y": 11.69,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "DRV Biomm",
        "x": 36.44,
        "y": 19.59,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "x": 42.63,
        "y": 38.53,
        "type": "fortiswitch",
        "width": 164,
        "height": 58,
        "icon": "fa-network-wired"
    },
    {
        "id": "PowerEdge R660 ²",
        "x": 42.16,
        "y": 11.9,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "DRV Olho Vivo",
        "x": 42.1,
        "y": 19.59,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "SwitchCore 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "x": 37.61,
        "y": 57.17,
        "type": "fortiswitch",
        "width": 82,
        "height": 70,
        "icon": "fa-network-wired"
    },
    {
        "id": "IMP-NL-DP IT Gi2/0/43",
        "x": 31.44,
        "y": 88.53,
        "type": "fortiswitch",
        "width": 50,
        "height": 40,
        "icon": "fa-print"
    },
    {
        "id": "IMP-NL-ADMINISTRATIVO IT Gi2/0/45",
        "x": 37.22,
        "y": 88.53,
        "type": "fortiswitch",
        "width": 50,
        "height": 40,
        "icon": "fa-print"
    },
    {
        "id": "IMP-NL-ALMOXARIFADO IT Gi2/0/13",
        "x": 42.9,
        "y": 88.53,
        "type": "fortiswitch",
        "width": 50,
        "height": 40,
        "icon": "fa-print"
    },
    {
        "id": "PowerVault ME5024",
        "x": 48.95,
        "y": 12.12,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "Portaria 2x N3048P",
        "x": 47.87,
        "y": 19.48,
        "type": "fortiswitch",
        "width": 98,
        "height": 42,
        "icon": "fa-network-wired"
    },
    {
        "id": "09-AP-NL-ALMOXARIFAD-LOG IT Gi1/0/35",
        "x": 28.58,
        "y": 81.06,
        "type": "fortiswitch",
        "width": 50,
        "height": 40,
        "icon": "fa-route"
    },
    {
        "id": "20-AP-NL-SALA-TREINAMENTO IT Gi2/0/41",
        "x": 34.41,
        "y": 81.06,
        "type": "fortiswitch",
        "width": 50,
        "height": 40,
        "icon": "fa-route"
    },
    {
        "id": "IMP-NL-GQ-COLORIDO IT Gi2/0/36",
        "x": 45.81,
        "y": 81.06,
        "type": "fortiswitch",
        "width": 50,
        "height": 40,
        "icon": "fa-print"
    },
    {
        "id": "02-AP-NL-CORREDOR-ADM IT Gi2/0/46",
        "x": 28.69,
        "y": 72.4,
        "type": "forti",
        "width": 89,
        "height": 40,
        "icon": "fa-route"
    },
    {
        "id": "IMP-NL-LOG-ESCRITORIO IT Gi2/0/44",
        "x": 40.14,
        "y": 81.17,
        "type": "forti",
        "width": 50,
        "height": 40,
        "icon": "fa-print"
    },
    {
        "id": "03-AP-NL-ADM IT Gi2/0/47",
        "x": 34.41,
        "y": 72.29,
        "type": "forti",
        "width": 82,
        "height": 44,
        "icon": "fa-route"
    },
    {
        "id": "07-AP-NL-REFEITORIO IT Gi2/0/47",
        "x": 40.09,
        "y": 72.4,
        "type": "forti",
        "width": 50,
        "height": 40,
        "icon": "fa-route"
    },
    {
        "id": "08-AP-NL-ANTECAMARA-LOG IT Gi1/0/47",
        "x": 45.77,
        "y": 72.41,
        "type": "forti",
        "width": 57,
        "height": 40,
        "icon": "fa-route"
    },
    {
        "id": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "x": 56.66,
        "y": 37.99,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "Piso 2  2x N3048P\r\nsw-biomm-p2-01",
        "x": 56.62,
        "y": 54.65,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "MQE ²",
        "x": 80.97,
        "y": 11.8,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "sensorweb",
        "x": 58.06,
        "y": 11.47,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "sensorweb ²",
        "x": 63.88,
        "y": 11.36,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "sensorweb ³",
        "x": 69.54,
        "y": 11.36,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "MQE",
        "x": 75.31,
        "y": 11.47,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "UniFI",
        "x": 67.1,
        "y": 37.99,
        "type": "fortiswitch",
        "icon": "fa-network-wired"
    },
    {
        "id": "01-AP-NL-TI IT Gi2/0/45",
        "x": 84.47,
        "y": 24.89,
        "type": "forti",
        "width": 72,
        "height": 58,
        "icon": "fa-route"
    },
    {
        "id": "Sem nome IT Gi1/0/46",
        "x": 79.09,
        "y": 53.25,
        "type": "forti",
        "icon": "fa-route"
    },
    {
        "id": "18-AP-NL-CQ-MICRO IT Gi1/0/29",
        "x": 70.5,
        "y": 61.69,
        "type": "forti",
        "icon": "fa-route"
    },
    {
        "id": "10-AP-NL-CONTROL-QUALID IT Gi1/0/24",
        "x": 79.09,
        "y": 61.58,
        "type": "forti",
        "width": 117,
        "height": 40,
        "icon": "fa-route"
    },
    {
        "id": "19-AP-NL-CQ-REUNIAO IT Gi1/0/47",
        "x": 70.12,
        "y": 53.14,
        "type": "forti",
        "icon": "fa-route"
    },
    {
        "id": "IMP-NL-CQ-MICROBIOLOGICO IT Gi2/0/31",
        "x": 88.76,
        "y": 53.25,
        "type": "zabbix",
        "icon": "fa-print"
    },
    {
        "id": "IMP-NL-CQ-FISICO IT Gi1/0/7",
        "x": 78.33,
        "y": 69.59,
        "type": "zabbix",
        "icon": "fa-print"
    },
    {
        "id": "Engenharia 2x N3048P\r\nsw-biomm-p5-01",
        "x": 54.61,
        "y": 77.71,
        "type": "fortiswitch",
        "width": 66,
        "height": 64,
        "icon": "fa-network-wired"
    },
    {
        "id": "04-AP-NL-ENG\r\ninterface Gi2/0/45",
        "x": 58.35,
        "y": 87.34,
        "type": "forti",
        "icon": "fa-route"
    },
    {
        "id": "IMP-NL-ENGENHARIA\r\ninterface Gi1/0/39",
        "x": 70.07,
        "y": 87.23,
        "type": "forti",
        "icon": "fa-print"
    },
    {
        "id": "DCS ³",
        "x": 73.8,
        "y": 79.11,
        "type": "zabbix",
        "icon": "fa-server"
    },
    {
        "id": "DCS ²",
        "x": 67.98,
        "y": 77.92,
        "type": "zabbix",
        "icon": "fa-server"
    },
    {
        "id": "DCS",
        "x": 61.83,
        "y": 77.92,
        "type": "zabbix",
        "icon": "fa-server"
    },
    {
        "id": "MQE - P2-01",
        "x": 85.79,
        "y": 61.47,
        "type": "fortiswitch",
        "icon": "fa-laptop"
    },
    {
        "id": "MQE ³ - P2-01",
        "x": 85.68,
        "y": 69.59,
        "type": "forti",
        "icon": "fa-laptop"
    },
    {
        "id": "MQE ² - P2-01",
        "x": 91.63,
        "y": 61.47,
        "type": "forti",
        "icon": "fa-laptop"
    },
    {
        "id": "MQE ⁴ - P2-01",
        "x": 91.68,
        "y": 69.59,
        "type": "forti",
        "icon": "fa-laptop"
    },
    {
        "id": "06-AP-NL-PROD-GRAU-D IT Gi2/0/47",
        "x": 66.58,
        "y": 24.89,
        "type": "forti",
        "width": 62,
        "height": 46,
        "icon": "fa-route"
    },
    {
        "id": "16-AP-NL-PROD-GRAU-C IT Gi1/0/31",
        "x": 72.72,
        "y": 24.89,
        "type": "forti",
        "width": 50,
        "height": 56,
        "icon": "fa-route"
    },
    {
        "id": "17-AP-NL-COORD-PROD IT Gi1/0/46",
        "x": 90.24,
        "y": 24.89,
        "type": "forti",
        "width": 50,
        "height": 58,
        "icon": "fa-route"
    },
    {
        "id": "15-AP-NL-CAMARA-FRIA-QUARENTENA IT Gi1/0/43",
        "x": 78.6,
        "y": 25.11,
        "type": "forti",
        "width": 50,
        "height": 56,
        "icon": "fa-route"
    },
    {
        "id": "05-AP-NL-CORD-PROD IT Gi2/0/33",
        "x": 95.96,
        "y": 24.89,
        "type": "forti",
        "width": 50,
        "height": 58,
        "icon": "fa-route"
    },
    {
        "id": "IMP-NL-PRODDUCAO IT Gi1/0/39",
        "x": 89.6,
        "y": 35.39,
        "type": "zabbix",
        "width": 50,
        "height": 56,
        "icon": "fa-print"
    },
    {
        "id": "IMP-NL-PROD-EMBALAGEM IT Gi1/0/16",
        "x": 83.68,
        "y": 35.39,
        "type": "zabbix",
        "width": 50,
        "height": 56,
        "icon": "fa-print"
    }
];

let links = [
    {
        "src": "IMP-SAO-ESCRITORIO\r\nGi1/0/12",
        "dst": "sw-biomm-SP-01\r\nDell N1548",
        "style": "H-V",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "PowerEdgeT420",
        "dst": "sw-biomm-SP-01\r\nDell N1548",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "sw-biomm-SP-01\r\nDell N1548",
        "dst": "13-AP-SAO-SALA-HERALDO\r\nIT Gi1/0/44",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "11-AP-SAO-SALA-REUNIAO\r\nIT Gi1/0/42",
        "dst": "sw-biomm-SP-01\r\nDell N1548",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "12-AP-SAO-ESCRITORIO-ADM\r\nIT Gi1/0/45",
        "dst": "sw-biomm-SP-01\r\nDell N1548",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "sw-biomm-SP-01\r\nDell N1548",
        "dst": "Sonicwall TZ 470",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#334155",
        "forceAnimate": false
    },
    {
        "src": "Sonicwall TZ 470",
        "dst": "Tellium",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Vivo",
        "dst": "Sonicwall TZ 470",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Vivo",
        "dst": "Nuvem",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#04ff00",
        "forceAnimate": false
    },
    {
        "src": "Tellium",
        "dst": "Nuvem",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#04ff00",
        "forceAnimate": false
    },
    {
        "src": "Nuvem",
        "dst": "Kater",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#04ff00",
        "forceAnimate": false
    },
    {
        "src": "Nuvem",
        "dst": "Algar",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#04ff00",
        "forceAnimate": false
    },
    {
        "src": "Nuvem",
        "dst": "ATC",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#04ff00",
        "forceAnimate": false
    },
    {
        "src": "Kater",
        "dst": "Sonicwall TZ 670",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Algar",
        "dst": "Sonicwall TZ 670",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "ATC",
        "dst": "Sonicwall TZ 670",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Sonicwall TZ 670",
        "dst": "Nuvem",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Sonicwall TZ 670",
        "dst": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "PowerEdge R760",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "Storage SC2020",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "PowerEdge R660",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "DRV Biomm",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "PowerEdge R660 ²",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "DRV Olho Vivo",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "PowerVault ME5024",
        "dst": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#334155",
        "forceAnimate": false
    },
    {
        "src": "Portaria 2x N3048P",
        "dst": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "IMP-NL-DP IT Gi2/0/43",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "IMP-NL-ADMINISTRATIVO IT Gi2/0/45",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "IMP-NL-ALMOXARIFADO IT Gi2/0/13",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "09-AP-NL-ALMOXARIFAD-LOG IT Gi1/0/35",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "20-AP-NL-SALA-TREINAMENTO IT Gi2/0/41",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "IMP-NL-GQ-COLORIDO IT Gi2/0/36",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "08-AP-NL-ANTECAMARA-LOG IT Gi1/0/47",
        "dst": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#334155",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "02-AP-NL-CORREDOR-ADM IT Gi2/0/46",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "03-AP-NL-ADM IT Gi2/0/47",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "07-AP-NL-REFEITORIO IT Gi2/0/47",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "dst": "IMP-NL-LOG-ESCRITORIO IT Gi2/0/44",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "dst": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 2  2x N3048P\r\nsw-biomm-p2-01",
        "dst": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "dst": "sensorweb",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#006aff",
        "forceAnimate": false
    },
    {
        "src": "Engenharia 2x N3048P\r\nsw-biomm-p5-01",
        "dst": "DCS ³",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#006aff",
        "forceAnimate": false
    },
    {
        "src": "Engenharia 2x N3048P\r\nsw-biomm-p5-01",
        "dst": "DCS ²",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#006aff",
        "forceAnimate": false
    },
    {
        "src": "Engenharia 2x N3048P\r\nsw-biomm-p5-01",
        "dst": "DCS",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#006aff",
        "forceAnimate": false
    },
    {
        "src": "Engenharia 2x N3048P\r\nsw-biomm-p5-01",
        "dst": "04-AP-NL-ENG\r\ninterface Gi2/0/45",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Engenharia 2x N3048P\r\nsw-biomm-p5-01",
        "dst": "IMP-NL-ENGENHARIA\r\ninterface Gi1/0/39",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 2  2x N3048P\r\nsw-biomm-p2-01",
        "dst": "Sem nome IT Gi1/0/46",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 2  2x N3048P\r\nsw-biomm-p2-01",
        "dst": "18-AP-NL-CQ-MICRO IT Gi1/0/29",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 2  2x N3048P\r\nsw-biomm-p2-01",
        "dst": "10-AP-NL-CONTROL-QUALID IT Gi1/0/24",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 2  2x N3048P\r\nsw-biomm-p2-01",
        "dst": "19-AP-NL-CQ-REUNIAO IT Gi1/0/47",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 2  2x N3048P\r\nsw-biomm-p2-01",
        "dst": "IMP-NL-CQ-MICROBIOLOGICO IT Gi2/0/31",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 2  2x N3048P\r\nsw-biomm-p2-01",
        "dst": "IMP-NL-CQ-FISICO IT Gi1/0/7",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 2  2x N3048P\r\nsw-biomm-p2-01",
        "dst": "MQE - P2-01",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#006aff",
        "forceAnimate": false
    },
    {
        "src": "Piso 2  2x N3048P\r\nsw-biomm-p2-01",
        "dst": "MQE ³ - P2-01",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#006aff",
        "forceAnimate": false
    },
    {
        "src": "Piso 2  2x N3048P\r\nsw-biomm-p2-01",
        "dst": "MQE ² - P2-01",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#006aff",
        "forceAnimate": false
    },
    {
        "src": "Piso 2  2x N3048P\r\nsw-biomm-p2-01",
        "dst": "MQE ⁴ - P2-01",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#006aff",
        "forceAnimate": false
    },
    {
        "src": "Engenharia 2x N3048P\r\nsw-biomm-p5-01",
        "dst": "SwitchCore\r\n 2x N4032F / 2x N4032\r\nsw-biomm-core1",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "dst": "sensorweb ²",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#006aff",
        "forceAnimate": false
    },
    {
        "src": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "dst": "sensorweb ³",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#006aff",
        "forceAnimate": false
    },
    {
        "src": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "dst": "MQE",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#006aff",
        "forceAnimate": false
    },
    {
        "src": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "dst": "MQE ²",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#006aff",
        "forceAnimate": false
    },
    {
        "src": "UniFI",
        "dst": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "01-AP-NL-TI IT Gi2/0/45",
        "dst": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "dst": "01-AP-NL-TI IT Gi2/0/45",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "dst": "UniFI",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "dst": "IMP-NL-PRODDUCAO IT Gi1/0/39",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "dst": "IMP-NL-PROD-EMBALAGEM IT Gi1/0/16",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "dst": "17-AP-NL-COORD-PROD IT Gi1/0/46",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "dst": "15-AP-NL-CAMARA-FRIA-QUARENTENA IT Gi1/0/43",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "dst": "05-AP-NL-CORD-PROD IT Gi2/0/33",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    },
    {
        "src": "Piso 1 2x N3048P\r\nsw-biomm-p1-01",
        "dst": "06-AP-NL-PROD-GRAU-D IT Gi2/0/47",
        "style": "H-V",
        "type": "SNMP",
        "customColor": "#e60050",
        "forceAnimate": false
    }
];

// =====================================================================================
// 🔴🔴🔴 ÁREA DE DADOS (FIM) 🔴🔴🔴
// =====================================================================================

// --- RENDER ---
function getIconClass(node) {
    if (node.icon) return node.icon;
    if (node.type === 'zabbix') return 'fa-laptop-code';
    if (node.type === 'fortiap') return 'fa-wifi';
    return 'fa-network-wired';
}
function getCardClass(node) {
    if (node.type === 'zabbix') return 'card-zabbix';
    if (node.type === 'fortiap') return 'card-fortiap';
    if (node.type === 'fortiswitch') return 'card-fortiswitch';
    return 'card-forti';
}
function updateNodeStatus(node, el) {
    if (!node.metricBind) return;
    const metricList = getMetricData();
    const metric = metricList.find(m => m.name === node.metricBind);
    el.classList.remove('status-online', 'status-offline');
    if (metric) {
        const nameEl = el.querySelector('.node-name');
        if (nameEl) nameEl.innerText = metric.name.split(':')[0];
        if (isStatusOnline(metric.value)) el.classList.add('status-online');
        else el.classList.add('status-offline');
    }
}
function updateNodeContentScale(el, w, h) {
    if (!w || !h) return;
    const sizeBase = Math.min(w, h * 1.5);
    const iconSize = Math.max(18, sizeBase * 0.22);
    const textSize = Math.max(10, sizeBase * 0.12);
    const icon = el.querySelector('.node-icon');
    const text = el.querySelector('.node-name');
    if (icon) icon.style.fontSize = iconSize + 'px';
    if (text) text.style.fontSize = textSize + 'px';
}

function createNodes() {
    nodesLayer.innerHTML = '';
    const w = container.clientWidth;
    const h = container.clientHeight;
    nodes.forEach(node => {
        if (typeof node.px === 'undefined') { node.px = (node.x / 100) * w; node.py = (node.y / 100) * h; }
        const el = document.createElement('div');
        el.className = `node-card ${getCardClass(node)}`;
        el.id = `card-${node.id}`;
        if (node.width) el.style.width = node.width + 'px';
        if (node.height) el.style.height = node.height + 'px';
        if (node.resizable) el.classList.add('is-resizable');
        el.style.left = node.px + 'px'; el.style.top = node.py + 'px';
        el.innerHTML = `<i class="node-icon fa ${getIconClass(node)}"></i><div class="node-name">${node.id}</div><div class="resize-handle"></div>`;
        node.el = el;
        if (node.width && node.height) updateNodeContentScale(el, node.width, node.height);
        updateNodeStatus(node, el);
        el.addEventListener('mousedown', (e) => { if (e.button === 0 && !e.target.classList.contains('resize-handle')) { if (connectionSourceNode && connectionSourceNode !== node) { completeConnection(node); e.stopPropagation(); } else { startDrag(e, node); } } });
        const handle = el.querySelector('.resize-handle');
        handle.addEventListener('mousedown', (e) => { e.stopPropagation(); startResize(e, node); });
        el.addEventListener('contextmenu', (e) => { e.preventDefault(); if (connectionSourceNode) cancelConnectionMode(); showContextMenu(e, node); });
        nodesLayer.appendChild(el);
    });
}

function drawLines() {
    linesLayer.innerHTML = ''; breakpointsLayer.innerHTML = ''; labelsLayer.innerHTML = '';
    const w = container.clientWidth; const h = container.clientHeight; const metricList = getMetricData();
    const outgoingMap = {};
    links.forEach(link => { if (!link.breakpoints || link.breakpoints.length === 0) { if (link.style === 'H-V') { if (!outgoingMap[link.src]) outgoingMap[link.src] = []; outgoingMap[link.src].push(link); } } });
    Object.keys(outgoingMap).forEach(srcId => { const group = outgoingMap[srcId]; const count = group.length; if (count > 1) { const spread = 12; group.forEach((link, index) => { const center = (count - 1) / 2; link.srcOffset = (index - center) * spread; }); } else { group[0].srcOffset = 0; } });

    links.forEach(link => {
        const n1 = nodes.find(n => n.id === link.src); const n2 = nodes.find(n => n.id === link.dst);
        if (n1 && n2) {
            const x1 = n1.px; const y1 = n1.py; const x2 = n2.px; const y2 = n2.py;
            let strokeColor = link.customColor ? link.customColor : '#334155';

            if (link.isP2P) {
                const yOffset = link.srcOffset || 0; const turnX = ((x1 + x2) / 2) + yOffset; const midX = turnX; const midY = (y1 + y2) / 2;
                const getStatus = (bindName) => { if (!bindName) return 'default'; const m = metricList.find(metric => metric.name === bindName); if (!m) return 'default'; if (m.name.includes('Bits')) return 'online'; return isStatusOnline(m.value) ? 'online' : 'offline'; };
                const statusA = getStatus(link.metricBind); const statusB = getStatus(link.metricBindSec);
                const getHexColor = (s) => { if (s === 'online') return '#39ff14'; if (s === 'offline') return '#ff0000'; return strokeColor; };

                const drawHalf = (d, status, isSource) => {
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', d);
                    let cssClass = 'connector-line';
                    if (status === 'online') cssClass += ' line-online'; else if (status === 'offline') cssClass += ' line-offline';
                    if (link.forceAnimate) cssClass += ' line-animated';
                    path.setAttribute('class', cssClass);
                    path.setAttribute('fill', 'none');
                    path.style.cursor = 'pointer';
                    if (status === 'default') path.style.stroke = strokeColor;
                    path.addEventListener('click', (e) => { e.stopPropagation(); const specificBind = isSource ? link.metricBind : link.metricBindSec; if (specificBind) openConnectionDetails({ ...link, metricBind: specificBind }); });
                    path.addEventListener('contextmenu', (e) => { e.preventDefault(); showLineContextMenu(e, link); });
                    linesLayer.appendChild(path); return path;
                };
                const pathA = drawHalf(`M ${x1} ${y1} L ${turnX} ${y1} L ${midX} ${midY}`, statusA, true);
                const pathB = drawHalf(`M ${x2} ${y2} L ${turnX} ${y2} L ${midX} ${midY}`, statusB, false);
                const isVerticalConnection = Math.abs(y1 - y2) > 20;
                const createArrow = (status, isSourceSide) => {
                    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path'); let d = '';
                    if (isVerticalConnection) { if (isSourceSide) { if (y1 < midY) d = `M ${midX - 5} ${midY - 10} L ${midX} ${midY} L ${midX + 5} ${midY - 10} Z`; else d = `M ${midX - 5} ${midY + 10} L ${midX} ${midY} L ${midX + 5} ${midY + 10} Z`; } else { if (y2 < midY) d = `M ${midX - 5} ${midY - 10} L ${midX} ${midY} L ${midX + 5} ${midY - 10} Z`; else d = `M ${midX - 5} ${midY + 10} L ${midX} ${midY} L ${midX + 5} ${midY + 10} Z`; } } else { if (isSourceSide) { if (x1 < midX) d = `M ${midX - 10} ${midY - 5} L ${midX} ${midY} L ${midX - 10} ${midY + 5} Z`; else d = `M ${midX + 10} ${midY - 5} L ${midX} ${midY} L ${midX + 10} ${midY + 5} Z`; } else { if (x2 > midX) d = `M ${midX + 10} ${midY - 5} L ${midX} ${midY} L ${midX + 10} ${midY + 5} Z`; else d = `M ${midX - 10} ${midY - 5} L ${midX} ${midY} L ${midX - 10} ${midY + 5} Z`; } }
                    arrow.setAttribute('d', d); arrow.setAttribute('fill', getHexColor(status)); arrow.setAttribute('stroke', 'none'); linesLayer.appendChild(arrow);
                };
                createArrow(statusA, true); createArrow(statusB, false);
                if (link.metricBind) createInteractiveLabel(link, 'primary', 0.5, pathA);
                if (link.metricBindSec) createInteractiveLabel(link, 'secondary', 0.5, pathB);
            } else {
                let d = ''; let typeClass = 'line-up'; if (link.type === 'PING') typeClass = 'line-ping';
                if (link.metricBind) { const metric = metricList.find(m => m.name === link.metricBind); if (metric) { if (metric.name.includes('Bits')) typeClass = 'line-online'; else typeClass = isStatusOnline(metric.value) ? 'line-online' : 'line-offline'; } }
                else { typeClass = ''; }
                if (link.forceAnimate) typeClass += ' line-animated';
                if (link.style === 'H-V') { const yOffset = link.srcOffset || 0; d = `M ${x1} ${y1} L ${x1} ${y1 + yOffset} L ${x2} ${y1 + yOffset} L ${x2} ${y2}`; } else { d = `M ${x1} ${y1} L ${x2} ${y2}`; }
                if (link.breakpoints && link.breakpoints.length > 0) { d = `M ${x1} ${y1}`; link.breakpoints.forEach((bp, index) => { bp.px = (bp.x / 100) * w; bp.py = (bp.y / 100) * h; d += ` L ${bp.px} ${bp.py}`; createBreakpointHandle(bp, link, index); }); d += ` L ${x2} ${y2}`; }
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', d);
                path.setAttribute('class', `connector-line ${typeClass}`);
                if (link.customColor && !typeClass.includes('line-online') && !typeClass.includes('line-offline')) { path.style.stroke = link.customColor; }
                let arrowEnd = 'url(#end-arrow-default)';
                if (typeClass.includes('line-online')) arrowEnd = 'url(#end-arrow-online)';
                if (typeClass.includes('line-offline')) arrowEnd = 'url(#end-arrow-offline)';
                path.setAttribute('marker-end', arrowEnd);
                if (link.metricBind || link.metricBindSec) { path.style.cursor = 'pointer'; path.addEventListener('click', (e) => { e.stopPropagation(); openConnectionDetails(link); }); }
                path.addEventListener('contextmenu', (e) => { e.preventDefault(); showLineContextMenu(e, link); });
                linesLayer.appendChild(path);
                if (link.metricBind) createInteractiveLabel(link, 'primary', 0.5, path);
                if (link.metricBindSec && !link.metricBind) createInteractiveLabel(link, 'secondary', 0.5, path);
            }
        }
    });
}

function createBreakpointHandle(bp, link, index) { const handle = document.createElement('div'); handle.className = 'breakpoint-handle'; handle.style.left = bp.px + 'px'; handle.style.top = bp.py + 'px'; handle.addEventListener('mousedown', (e) => { if (e.button === 0) { e.stopPropagation(); startDragBreakpoint(e, link, index); } }); handle.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); showBreakpointContextMenu(e, link, index); }); breakpointsLayer.appendChild(handle); }
function createInteractiveLabel(link, slot, defaultPercent, pathElement) { const bindName = slot === 'secondary' ? link.metricBindSec : link.metricBind; if (!bindName) return; const metricList = getMetricData(); const m = metricList.find(metric => metric.name === bindName); if (!m) return; const savedPosKey = slot === 'secondary' ? 'labelPosSecondary' : 'labelPosPrimary'; const percent = (link[savedPosKey] !== undefined) ? link[savedPosKey] : defaultPercent; const totalLen = pathElement.getTotalLength(); const point = pathElement.getPointAtLength(totalLen * percent); const label = document.createElement('div'); label.className = 'conn-label'; label.style.cursor = 'grab'; let iconHtml = '<i class="fa fa-circle"></i>'; let formatVal = getFormattedValue(m.name, m.value); if (m.name.includes('Bits received')) { label.classList.add('label-down'); iconHtml = '<i class="fa fa-arrow-down"></i>'; } else if (m.name.includes('Bits sent')) { label.classList.add('label-up'); iconHtml = '<i class="fa fa-arrow-up"></i>'; } else { label.classList.add('label-status'); iconHtml = isStatusOnline(m.value) ? '<i class="fa fa-check"></i>' : '<i class="fa fa-times"></i>'; } label.innerHTML = `${iconHtml} ${formatVal}`; label.style.left = point.x + 'px'; label.style.top = point.y + 'px'; label.addEventListener('mousedown', (e) => { if (e.button === 0) { e.stopPropagation(); draggedLabel = { link: link, slot: slot, path: pathElement, el: label }; closeAllMenus(); } }); labelsLayer.appendChild(label); }

function startConnectionMode(node) { connectionSourceNode = node; node.el.classList.add('is-connecting'); connectionMsg.style.display = 'block'; contextMenu.style.display = 'none'; }
function completeConnection(targetNode) { if (!connectionSourceNode) return; const exists = links.find(l => l.src === connectionSourceNode.id && l.dst === targetNode.id); if (!exists) { links.push({ src: connectionSourceNode.id, dst: targetNode.id, style: 'H-V', type: 'SNMP', customColor: '#334155', forceAnimate: false }); drawLines(); } cancelConnectionMode(); }
function cancelConnectionMode() { if (connectionSourceNode) { connectionSourceNode.el.classList.remove('is-connecting'); connectionSourceNode = null; } connectionMsg.style.display = 'none'; }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { cancelConnectionMode(); closeAllMenus(); } });
function startDrag(e, node) { closeAllMenus(); draggedNode = node; node.el.style.cursor = 'grabbing'; }
function startResize(e, node) { resizingNode = node; startResizeX = e.clientX; startResizeY = e.clientY; const rect = node.el.getBoundingClientRect(); startWidth = rect.width; startHeight = rect.height; container.style.cursor = 'nwse-resize'; }
function startDragBreakpoint(e, link, index) { closeAllMenus(); draggedBreakpoint = { link: link, index: index }; container.style.cursor = 'move'; }
function getClosestPercentOnPath(path, mouseX, mouseY) { const len = path.getTotalLength(); let bestDist = Infinity; let bestP = 0; const step = 6; for (let l = 0; l <= len; l += step) { const p = path.getPointAtLength(l); const dx = p.x - mouseX; const dy = p.y - mouseY; const dist = dx * dx + dy * dy; if (dist < bestDist) { bestDist = dist; bestP = l; } } const pEnd = path.getPointAtLength(len); const dEnd = (pEnd.x - mouseX) ** 2 + (pEnd.y - mouseY) ** 2; if (dEnd < bestDist) bestP = len; return bestP / len; }
function onMouseMove(e) { const rect = container.getBoundingClientRect(); const mouseX = e.clientX - rect.left; const mouseY = e.clientY - rect.top; if (draggedNode) { draggedNode.px = mouseX; draggedNode.py = mouseY; draggedNode.x = (mouseX / container.clientWidth) * 100; draggedNode.y = (mouseY / container.clientHeight) * 100; draggedNode.el.style.left = mouseX + 'px'; draggedNode.el.style.top = mouseY + 'px'; drawLines(); } else if (resizingNode) { const dx = e.clientX - startResizeX; const dy = e.clientY - startResizeY; let newW = startWidth + (dx * 2); let newH = startHeight + (dy * 2); if (newW < 50) newW = 50; if (newH < 40) newH = 40; resizingNode.width = newW; resizingNode.height = newH; resizingNode.el.style.width = newW + 'px'; resizingNode.el.style.height = newH + 'px'; updateNodeContentScale(resizingNode.el, newW, newH); } else if (draggedBreakpoint) { const bp = draggedBreakpoint.link.breakpoints[draggedBreakpoint.index]; bp.px = mouseX; bp.py = mouseY; bp.x = (mouseX / container.clientWidth) * 100; bp.y = (mouseY / container.clientHeight) * 100; drawLines(); } else if (draggedLabel) { const percent = getClosestPercentOnPath(draggedLabel.path, mouseX, mouseY); const totalLen = draggedLabel.path.getTotalLength(); const point = draggedLabel.path.getPointAtLength(totalLen * percent); draggedLabel.el.style.left = point.x + 'px'; draggedLabel.el.style.top = point.y + 'px'; const key = draggedLabel.slot === 'secondary' ? 'labelPosSecondary' : 'labelPosPrimary'; draggedLabel.link[key] = parseFloat(percent.toFixed(4)); } }
function onMouseUp() { if (draggedNode) { draggedNode.el.style.cursor = 'grab'; draggedNode = null; } if (resizingNode) { resizingNode = null; container.style.cursor = 'default'; } if (draggedBreakpoint) { draggedBreakpoint = null; container.style.cursor = 'default'; } if (draggedLabel) { draggedLabel = null; } }
container.addEventListener('mousemove', onMouseMove); container.addEventListener('mouseup', onMouseUp); container.addEventListener('mouseleave', onMouseUp);

function closeAllMenus() { contextMenu.style.display = 'none'; lineContextMenu.style.display = 'none'; breakpointContextMenu.style.display = 'none'; }
function showContextMenu(e, node) { closeAllMenus(); activeNodeContext = node; const rect = container.getBoundingClientRect(); contextMenu.style.display = 'block'; contextMenu.style.left = (e.clientX - rect.left) + 'px'; contextMenu.style.top = (e.clientY - rect.top) + 'px'; const isResizable = node.el.classList.contains('is-resizable'); btnResize.innerHTML = isResizable ? '<i class="fa fa-lock"></i> Travar Tamanho' : '<i class="fa fa-expand-arrows-alt"></i> Redimensionar'; }

function showLineContextMenu(e, link) {
    closeAllMenus(); activeLineContext = link;
    const rect = container.getBoundingClientRect();
    lastRightClickPos = { x: (e.clientX - rect.left), y: (e.clientY - rect.top) };
    inputLineColor.value = link.customColor || '#334155';
    inputLineAnimate.checked = link.forceAnimate || false;
    lineContextMenu.style.display = 'block'; lineContextMenu.style.left = lastRightClickPos.x + 'px'; lineContextMenu.style.top = lastRightClickPos.y + 'px';
}

inputLineColor.addEventListener('input', (e) => { if (activeLineContext) { activeLineContext.customColor = e.target.value; drawLines(); } });
inputLineAnimate.addEventListener('change', (e) => { if (activeLineContext) { activeLineContext.forceAnimate = e.target.checked; drawLines(); } });

function showBreakpointContextMenu(e, link, index) { closeAllMenus(); activeBreakpointContext = { link, index }; const rect = container.getBoundingClientRect(); breakpointContextMenu.style.display = 'block'; breakpointContextMenu.style.left = (e.clientX - rect.left) + 'px'; breakpointContextMenu.style.top = (e.clientY - rect.top) + 'px'; }
document.addEventListener('click', (e) => { if (!contextMenu.contains(e.target)) contextMenu.style.display = 'none'; if (!lineContextMenu.contains(e.target)) lineContextMenu.style.display = 'none'; if (!breakpointContextMenu.contains(e.target)) breakpointContextMenu.style.display = 'none'; });

if (btnBindData) btnBindData.onclick = () => { if (!activeNodeContext) return; activeLineContext = null; openDataModal(); };
if (btnConnect) btnConnect.onclick = () => { if (activeNodeContext) startConnectionMode(activeNodeContext); };
if (btnResize) btnResize.onclick = () => { if (activeNodeContext) { activeNodeContext.el.classList.toggle('is-resizable'); activeNodeContext.resizable = activeNodeContext.el.classList.contains('is-resizable'); closeAllMenus(); } };
if (btnIcon) btnIcon.onclick = () => { if (!activeNodeContext) return; closeAllMenus(); iconGrid.innerHTML = ''; availableIcons.forEach(icon => { const div = document.createElement('div'); div.className = 'icon-option'; div.innerHTML = `<i class="fa ${icon.class}"></i><span>${icon.name}</span>`; div.onclick = () => { activeNodeContext.icon = icon.class; reRenderAll(); iconModal.classList.add('modal-hidden'); }; iconGrid.appendChild(div); }); iconModal.classList.remove('modal-hidden'); };
if (btnRename) btnRename.onclick = () => { if (!activeNodeContext) return; const newId = prompt("Novo nome:", activeNodeContext.id); if (newId && newId !== activeNodeContext.id) { const oldId = activeNodeContext.id; if (nodes.find(n => n.id === newId)) { alert('Nome existe.'); return; } activeNodeContext.id = newId; links.forEach(l => { if (l.src === oldId) l.src = newId; if (l.dst === oldId) l.dst = newId; }); reRenderAll(); } closeAllMenus(); };
if (btnDuplicate) btnDuplicate.onclick = () => { if (!activeNodeContext) return; let newId = activeNodeContext.id + "-COPY"; let c = 1; while (nodes.find(n => n.id === newId)) { newId = activeNodeContext.id + "-COPY" + c++; } const newNode = { ...activeNodeContext, id: newId, x: activeNodeContext.x + 2, y: activeNodeContext.y + 2, px: undefined, py: undefined }; delete newNode.el; nodes.push(newNode); reRenderAll(); closeAllMenus(); };
if (btnDelete) btnDelete.onclick = () => { if (activeNodeContext && confirm(`Excluir ${activeNodeContext.id}?`)) { nodes = nodes.filter(n => n.id !== activeNodeContext.id); links = links.filter(l => l.src !== activeNodeContext.id && l.dst !== activeNodeContext.id); reRenderAll(); } closeAllMenus(); };
if (btnBindLineData) btnBindLineData.onclick = () => { if (!activeLineContext) return; activeNodeContext = null; bindTargetSlot = 'primary'; openDataModal(); };
if (btnBindLineDataSec) btnBindLineDataSec.onclick = () => { if (!activeLineContext) return; activeNodeContext = null; bindTargetSlot = 'secondary'; openDataModal(); };
if (btnToggleP2P) btnToggleP2P.onclick = () => { if (activeLineContext) { activeLineContext.isP2P = !activeLineContext.isP2P; drawLines(); } closeAllMenus(); };
if (btnDeleteLine) btnDeleteLine.onclick = () => { if (activeLineContext) { links = links.filter(l => l !== activeLineContext); drawLines(); } closeAllMenus(); }
if (btnAddBreakpoint) btnAddBreakpoint.onclick = () => { if (activeLineContext) { if (!activeLineContext.breakpoints) activeLineContext.breakpoints = []; const w = container.clientWidth; const h = container.clientHeight; const bx = (lastRightClickPos.x / w) * 100; const by = (lastRightClickPos.y / h) * 100; activeLineContext.breakpoints.push({ x: bx, y: by }); drawLines(); } closeAllMenus(); }
if (btnRemoveBreakpoint) btnRemoveBreakpoint.onclick = () => { if (activeBreakpointContext) { activeBreakpointContext.link.breakpoints.splice(activeBreakpointContext.index, 1); drawLines(); } closeAllMenus(); }
if (closeDataModalBtn) closeDataModalBtn.onclick = () => dataModal.classList.add('modal-hidden');
if (closeIconModalBtn) closeIconModalBtn.onclick = () => iconModal.classList.add('modal-hidden');

function reRenderAll() { createNodes(); drawLines(); }

if (saveBtn) {
    saveBtn.addEventListener('click', () => {
        const cleanNodes = nodes.map(n => ({ id: n.id, x: parseFloat(n.x.toFixed(2)), y: parseFloat(n.y.toFixed(2)), type: n.type, ...(n.width ? { width: Math.round(n.width) } : {}), ...(n.height ? { height: Math.round(n.height) } : {}), ...(n.resizable ? { resizable: true } : {}), ...(n.icon ? { icon: n.icon } : {}), ...(n.metricBind ? { metricBind: n.metricBind } : {}) }));
        const cleanLinks = links.map(l => {
            const copy = { src: l.src, dst: l.dst, style: l.style, type: l.type, customColor: l.customColor, forceAnimate: l.forceAnimate };
            if (l.isP2P) copy.isP2P = true;
            if (l.metricBind) copy.metricBind = l.metricBind;
            if (l.metricBindSec) copy.metricBindSec = l.metricBindSec;
            if (l.offset) copy.offset = l.offset;
            if (l.labelPosPrimary !== undefined) copy.labelPosPrimary = l.labelPosPrimary;
            if (l.labelPosSecondary !== undefined) copy.labelPosSecondary = l.labelPosSecondary;
            if (l.breakpoints && l.breakpoints.length > 0) { copy.breakpoints = l.breakpoints.map(bp => ({ x: parseFloat(bp.x.toFixed(2)), y: parseFloat(bp.y.toFixed(2)) })); } return copy;
        });
        const jsonString = `// COPIE E SUBSTITUA AS LISTAS NO CÓDIGO JS:\nlet nodes = ${JSON.stringify(cleanNodes, null, 4)};\n\nlet links = ${JSON.stringify(cleanLinks, null, 4)};`;
        exportArea.value = jsonString; exportModal.classList.remove('modal-hidden');
    });
}
if (copyBtn) copyBtn.onclick = () => { exportArea.select(); document.execCommand('copy'); };
if (closeBtn) closeBtn.onclick = () => exportModal.classList.add('modal-hidden');

if (container) { reRenderAll(); new ResizeObserver(() => { const w = container.clientWidth; const h = container.clientHeight; nodes.forEach(node => { node.px = (node.x / 100) * w; node.py = (node.y / 100) * h; if (node.el) { node.el.style.left = node.px + 'px'; node.el.style.top = node.py + 'px'; } }); drawLines(); }).observe(container); }
