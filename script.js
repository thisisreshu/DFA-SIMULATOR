const DFAs = {
    endsWithAB: {
        description: "Accepts strings ending with 'ab'",
        alphabet: ['a', 'b'],
        states: {
            'q0': { x: 20, y: 50, isStart: true, isAccept: false },
            'q1': { x: 50, y: 50, isStart: false, isAccept: false },
            'q2': { x: 80, y: 50, isStart: false, isAccept: true }
        },
        transitions: [
            { from: 'q0', to: 'q1', symbols: ['a'] },
            { from: 'q0', to: 'q0', symbols: ['b'] },
            { from: 'q1', to: 'q1', symbols: ['a'] },
            { from: 'q1', to: 'q2', symbols: ['b'] },
            { from: 'q2', to: 'q1', symbols: ['a'] },
            { from: 'q2', to: 'q0', symbols: ['b'] }
        ]
    },
    evenZeros: {
        description: "Accepts strings with an even number of '0's",
        alphabet: ['0', '1'],
        states: {
            'q0': { x: 30, y: 50, isStart: true, isAccept: true },
            'q1': { x: 70, y: 50, isStart: false, isAccept: false }
        },
        transitions: [
            { from: 'q0', to: 'q1', symbols: ['0'] },
            { from: 'q0', to: 'q0', symbols: ['1'] },
            { from: 'q1', to: 'q0', symbols: ['0'] },
            { from: 'q1', to: 'q1', symbols: ['1'] }
        ]
    },
    contains11: {
        description: "Accepts strings containing '11'",
        alphabet: ['0', '1'],
        states: {
            'q0': { x: 20, y: 50, isStart: true, isAccept: false },
            'q1': { x: 50, y: 50, isStart: false, isAccept: false },
            'q2': { x: 80, y: 50, isStart: false, isAccept: true }
        },
        transitions: [
            { from: 'q0', to: 'q0', symbols: ['0'] },
            { from: 'q0', to: 'q1', symbols: ['1'] },
            { from: 'q1', to: 'q0', symbols: ['0'] },
            { from: 'q1', to: 'q2', symbols: ['1'] },
            { from: 'q2', to: 'q2', symbols: ['0', '1'] }
        ]
    }
};

let currentDFA = null;
let simulationTimeout = null;

// DOM Elements
const dfaSelect = document.getElementById('dfa-select');
const inputStringBox = document.getElementById('input-string');
const btnRun = document.getElementById('btn-run');
const btnReset = document.getElementById('btn-reset');
const nodesContainer = document.getElementById('nodes-container');
const edgesSvg = document.getElementById('edges-svg');
const tapeContainer = document.getElementById('tape');
const resultDisplay = document.getElementById('result-display');
const resultText = document.getElementById('result-text');
const alphabetInfo = document.getElementById('alphabet-info');
const descInfo = document.getElementById('desc-info');

// Event Listeners
dfaSelect.addEventListener('change', () => {
    loadDFA(dfaSelect.value);
});

btnRun.addEventListener('click', runSimulation);
btnReset.addEventListener('click', () => loadDFA(dfaSelect.value));

// Init
window.addEventListener('resize', () => renderDFA(currentDFA));
loadDFA('endsWithAB');

function loadDFA(dfaKey) {
    clearTimeout(simulationTimeout);
    currentDFA = DFAs[dfaKey];

    // Update Info
    alphabetInfo.textContent = `Alphabet: Σ = { ${currentDFA.alphabet.join(', ')} }`;
    descInfo.textContent = `Description: ${currentDFA.description}`;

    inputStringBox.value = '';
    resultDisplay.className = 'result-display hidden';
    tapeContainer.innerHTML = '';

    btnRun.disabled = false;
    inputStringBox.disabled = false;

    renderDFA(currentDFA);
}

function renderDFA(dfa) {
    nodesContainer.innerHTML = '';
    edgesSvg.innerHTML = '';

    // Add definitions for arrowheads
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('class', 'edge-arrow');
    marker.appendChild(polygon);
    defs.appendChild(marker);
    edgesSvg.appendChild(defs);

    const canvasWidth = edgesSvg.clientWidth || 800;
    const canvasHeight = edgesSvg.clientHeight || 400;

    // Render Nodes
    for (const [stateName, stateProps] of Object.entries(dfa.states)) {
        const node = document.createElement('div');
        node.className = 'dfa-node';
        if (stateProps.isStart) node.classList.add('start-state');
        if (stateProps.isAccept) node.classList.add('accept-state');
        node.id = `node-${stateName}`;
        node.textContent = stateName;

        // Convert percentage to actual pixels for node placement
        const px = (stateProps.x / 100) * canvasWidth;
        const py = (stateProps.y / 100) * canvasHeight;

        node.style.left = `${px}px`;
        node.style.top = `${py}px`;
        nodesContainer.appendChild(node);
    }

    // Render Edges
    // Pair reverse transitions to curve them
    const renderedPairs = new Set();

    dfa.transitions.forEach(transition => {
        const fromState = dfa.states[transition.from];
        const toState = dfa.states[transition.to];

        const x1 = (fromState.x / 100) * canvasWidth;
        const y1 = (fromState.y / 100) * canvasHeight;
        const x2 = (toState.x / 100) * canvasWidth;
        const y2 = (toState.y / 100) * canvasHeight;

        const hasReverse = dfa.transitions.some(t => t.from === transition.to && t.to === transition.from);

        drawEdge(x1, y1, x2, y2, transition.from, transition.to, transition.symbols.join(', '), hasReverse);
    });
}

function drawEdge(x1, y1, x2, y2, fromName, toName, labelText, isCurved) {
    const nodeRadius = 40;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.id = `edge-${fromName}-${toName}`;
    g.classList.add('edge-group');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'edge-path');
    path.setAttribute('marker-end', 'url(#arrowhead)');

    let cx, cy; // for label

    if (fromName === toName) {
        // Self loop
        const loopRadius = 35;
        path.setAttribute('d', `M ${x1 - 15} ${y1 - nodeRadius} A ${loopRadius} ${loopRadius} 0 1 1 ${x1 + 15} ${y1 - nodeRadius}`);
        cx = x1;
        cy = y1 - nodeRadius - loopRadius * 1.5;
    } else {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Adjust points to snap to node border
        const nx = dx / dist;
        const ny = dy / dist;
        const startX = x1 + nx * nodeRadius;
        const startY = y1 + ny * nodeRadius;
        const endX = x2 - nx * nodeRadius;
        const endY = y2 - ny * nodeRadius;

        if (isCurved) {
            // Curve the path
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            const offset = 40;
            const ctrlX = midX - ny * offset; // perpendicular offset
            const ctrlY = midY + nx * offset;

            path.setAttribute('d', `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`);
            cx = ctrlX;
            cy = ctrlY;
        } else {
            path.setAttribute('d', `M ${startX} ${startY} L ${endX} ${endY}`);
            cx = (startX + endX) / 2;
            cy = (startY + endY) / 2 - 15;
        }
    }

    path.setAttribute('stroke-dasharray', '10, 0'); // init

    // Label Background
    const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');

    text.setAttribute('class', 'edge-label');
    text.setAttribute('x', cx);
    text.setAttribute('y', cy);
    text.textContent = labelText;

    bg.setAttribute('class', 'edge-label-bg');
    bg.setAttribute('x', cx - 20);
    bg.setAttribute('y', cy - 12);
    bg.setAttribute('width', 40);
    bg.setAttribute('height', 24);

    textGroup.appendChild(bg);
    textGroup.appendChild(text);

    g.appendChild(path);
    g.appendChild(textGroup);
    edgesSvg.appendChild(g);
}

async function runSimulation() {
    const inputStr = inputStringBox.value.trim();

    // Validation
    const invalidChar = [...inputStr].find(c => !currentDFA.alphabet.includes(c));
    if (invalidChar) {
        inputStringBox.classList.add('error-border');
        setTimeout(() => inputStringBox.classList.remove('error-border'), 1000);
        return;
    }

    // Lock UI
    btnRun.disabled = true;
    inputStringBox.disabled = true;
    resultDisplay.className = 'result-display hidden';

    // Build Tape
    tapeContainer.innerHTML = '';
    const tapeCells = [];
    if (inputStr.length === 0) {
        const cell = document.createElement('div');
        cell.className = 'tape-cell';
        cell.textContent = 'ε'; // Epsilon for empty string
        tapeContainer.appendChild(cell);
        tapeCells.push(cell);
    } else {
        for (const char of inputStr) {
            const cell = document.createElement('div');
            cell.className = 'tape-cell';
            cell.textContent = char;
            tapeContainer.appendChild(cell);
            tapeCells.push(cell);
        }
    }

    // Reset Nodes visually
    document.querySelectorAll('.dfa-node').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.edge-group').forEach(e => e.classList.remove('active'));

    // Find Start State
    let currentStateName = Object.keys(currentDFA.states).find(k => currentDFA.states[k].isStart);
    let currentNode = document.getElementById(`node-${currentStateName}`);
    currentNode.classList.add('active');

    await sleep(800);

    // Simulation Loop
    const characters = inputStr.length === 0 ? [] : [...inputStr];

    for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        const cell = tapeCells[i];

        // Highlight tape cell
        cell.classList.add('active');

        // Find transition
        const transition = currentDFA.transitions.find(t => t.from === currentStateName && t.symbols.includes(char));
        if (!transition) {
            // Should not happen with well-defined DFAs but fallback just in case
            break;
        }

        const edgeId = `edge-${currentStateName}-${transition.to}`;
        const edgeG = document.getElementById(edgeId);

        // Highlight Transition Edge
        if (edgeG) edgeG.classList.add('active');

        await sleep(1000);

        // Move to next state
        currentNode.classList.remove('active');
        if (edgeG) edgeG.classList.remove('active');

        currentStateName = transition.to;
        currentNode = document.getElementById(`node-${currentStateName}`);
        currentNode.classList.add('active');

        cell.classList.remove('active');
        cell.classList.add('processed');
    }

    await sleep(500);

    // Evaluate result
    const isAccepted = currentDFA.states[currentStateName].isAccept;

    if (isAccepted) {
        resultDisplay.textContent = 'ACCEPTED';
        resultDisplay.className = 'result-display visible accepted';
        currentNode.classList.add('accept-state'); // Reinforce glow
    } else {
        resultDisplay.textContent = 'REJECTED';
        resultDisplay.className = 'result-display visible rejected';
    }

    btnRun.disabled = false;
    inputStringBox.disabled = false;
}

function sleep(ms) {
    return new Promise(resolve => {
        simulationTimeout = setTimeout(resolve, ms);
    });
}
