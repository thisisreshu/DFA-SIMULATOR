let currentDFA = null;
let simulationTimeout = null;

const numStatesInput = document.getElementById('num-states');
const startStateInput = document.getElementById('start-state');
const finalStatesInput = document.getElementById('final-states');
const transitionsContainer = document.getElementById('transitions-container');
const addTransitionBtn = document.getElementById('add-transition-btn');
const buildDfabtn = document.getElementById('build-dfa-btn');
const testStringInput = document.getElementById('test-string');
const runBtn = document.getElementById('run-btn');
const resultDisplay = document.getElementById('result-display');
const tapeContainer = document.getElementById('tape-container');
const nodesContainer = document.getElementById('nodes-container');
const edgesSvg = document.getElementById('edges-svg');

function createTransitionRow(from = '', input = '', to = '') {
    const div = document.createElement('div');
    div.className = 'transition-row';
    div.innerHTML = `
        <input type="text" placeholder="Current (e.g. q0)" class="t-from" value="${from}">
        <input type="text" placeholder="Input (e.g. a)" class="t-input" value="${input}">
        <input type="text" placeholder="Final (e.g. q1)" class="t-to" value="${to}">
        <button class="remove-btn" onclick="this.parentElement.remove()">X</button>
    `;
    transitionsContainer.appendChild(div);
}

// Initial defaults
createTransitionRow('q0', 'a', 'q1');
createTransitionRow('q0', 'b', 'q0');
createTransitionRow('q1', 'a', 'q1');
createTransitionRow('q1', 'b', 'q2');
createTransitionRow('q2', 'a', 'q1');
createTransitionRow('q2', 'b', 'q0');

addTransitionBtn.addEventListener('click', () => createTransitionRow());

buildDfabtn.addEventListener('click', buildDFA);

runBtn.addEventListener('click', runSimulation);

window.addEventListener('resize', () => {
    if(currentDFA) renderDFA(currentDFA);
});

function buildDFA() {
    clearTimeout(simulationTimeout);
    resultDisplay.className = 'result';
    tapeContainer.innerHTML = '';
    
    const numStates = parseInt(numStatesInput.value) || 1;
    const startState = startStateInput.value.trim();
    const finalStates = finalStatesInput.value.split(',').map(s => s.trim()).filter(s => s);
    
    const states = {};
    for (let i = 0; i < numStates; i++) {
        const stateName = `q${i}`;
        const angle = (Math.PI * 2 * i) / numStates - Math.PI / 2;
        const radius = numStates > 1 ? 35 : 0; 
        
        states[stateName] = {
            isStart: stateName === startState,
            isAccept: finalStates.includes(stateName),
            x: 50 + radius * Math.cos(angle),
            y: 50 + radius * Math.sin(angle)
        };
    }

    if (!states[startState] && numStates > 0) {
        states[startState] = {
            isStart: true,
            isAccept: finalStates.includes(startState),
            x: 50, y: 50
        };
    }
    
    const transitionRows = document.querySelectorAll('.transition-row');
    const transitions = [];
    const alphabet = new Set();
    const groupedTrans = {};

    transitionRows.forEach(row => {
        const from = row.querySelector('.t-from').value.trim();
        const inputStr = row.querySelector('.t-input').value.trim();
        const to = row.querySelector('.t-to').value.trim();
        
        if (from && inputStr && to) {
            const symbols = inputStr.split(',').map(s => s.trim());
            symbols.forEach(s => alphabet.add(s));

            const key = `${from}->${to}`;
            if (!groupedTrans[key]) {
                groupedTrans[key] = { from, to, symbols: [] };
                transitions.push(groupedTrans[key]);
            }
            groupedTrans[key].symbols.push(...symbols);
        }
    });

    currentDFA = {
        states,
        transitions,
        alphabet: Array.from(alphabet)
    };

    renderDFA(currentDFA);
}

function renderDFA(dfa) {
    nodesContainer.innerHTML = '';
    edgesSvg.innerHTML = '';

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

    const canvasWidth = edgesSvg.clientWidth || 600;
    const canvasHeight = edgesSvg.clientHeight || 400;

    for (const [stateName, stateProps] of Object.entries(dfa.states)) {
        const node = document.createElement('div');
        node.className = 'dfa-node';
        if (stateProps.isStart) node.classList.add('start-state');
        if (stateProps.isAccept) node.classList.add('accept-state');
        node.id = `node-${stateName}`;
        node.textContent = stateName;

        const px = (stateProps.x / 100) * canvasWidth;
        const py = (stateProps.y / 100) * canvasHeight;

        node.style.left = `${px}px`;
        node.style.top = `${py}px`;
        nodesContainer.appendChild(node);
    }

    dfa.transitions.forEach(transition => {
        const fromState = dfa.states[transition.from];
        const toState = dfa.states[transition.to];
        if(!fromState || !toState) return;

        const x1 = (fromState.x / 100) * canvasWidth;
        const y1 = (fromState.y / 100) * canvasHeight;
        const x2 = (toState.x / 100) * canvasWidth;
        const y2 = (toState.y / 100) * canvasHeight;

        const hasReverse = dfa.transitions.some(t => t.from === transition.to && t.to === transition.from);
        const displayLabel = Array.from(new Set(transition.symbols)).join(',');
        
        drawEdge(x1, y1, x2, y2, transition.from, transition.to, displayLabel, hasReverse);
    });
}

function drawEdge(x1, y1, x2, y2, fromName, toName, labelText, isCurved) {
    const nodeRadius = 23;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.id = `edge-${fromName}-${toName}`;
    g.classList.add('edge-group');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'edge-path');
    path.setAttribute('marker-end', 'url(#arrowhead)');

    let cx, cy; 

    if (fromName === toName) {
        const loopRadius = 25;
        path.setAttribute('d', `M ${x1 - 10} ${y1 - nodeRadius} A ${loopRadius} ${loopRadius} 0 1 1 ${x1 + 10} ${y1 - nodeRadius}`);
        cx = x1;
        cy = y1 - nodeRadius - loopRadius * 1.5;
    } else {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if(dist === 0) return;

        const nx = dx / dist;
        const ny = dy / dist;
        const startX = x1 + nx * nodeRadius;
        const startY = y1 + ny * nodeRadius;
        const endX = x2 - nx * nodeRadius;
        const endY = y2 - ny * nodeRadius;

        if (isCurved) {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            const offset = 30;
            const ctrlX = midX - ny * offset; 
            const ctrlY = midY + nx * offset;

            path.setAttribute('d', `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`);
            cx = ctrlX;
            cy = ctrlY;
        } else {
            path.setAttribute('d', `M ${startX} ${startY} L ${endX} ${endY}`);
            cx = (startX + endX) / 2;
            cy = (startY + endY) / 2 - 12;
        }
    }

    const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');

    text.setAttribute('class', 'edge-label');
    text.setAttribute('x', cx);
    text.setAttribute('y', cy);
    text.textContent = labelText;

    bg.setAttribute('class', 'edge-label-bg');
    bg.setAttribute('x', cx - 15);
    bg.setAttribute('y', cy - 10);
    bg.setAttribute('width', 30);
    bg.setAttribute('height', 20);

    textGroup.appendChild(bg);
    textGroup.appendChild(text);

    g.appendChild(path);
    g.appendChild(textGroup);
    edgesSvg.appendChild(g);
}

function sleep(ms) {
    return new Promise(resolve => {
        simulationTimeout = setTimeout(resolve, ms);
    });
}

async function runSimulation() {
    if (!currentDFA) {
        alert("Please build the DFA first!");
        return;
    }

    const inputStr = testStringInput.value.trim();
    
    // UI logic lock
    runBtn.disabled = true;
    testStringInput.disabled = true;
    buildDfabtn.disabled = true;
    resultDisplay.className = 'result';

    tapeContainer.innerHTML = '';
    const tapeCells = [];
    if (inputStr.length === 0) {
        const cell = document.createElement('div');
        cell.className = 'tape-cell';
        cell.textContent = 'ε';
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

    document.querySelectorAll('.dfa-node').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.edge-group').forEach(e => e.classList.remove('active'));

    const startStateName = Object.keys(currentDFA.states).find(k => currentDFA.states[k].isStart);
    if(!startStateName) {
        alert("No start state defined!");
        runBtn.disabled = false;
        testStringInput.disabled = false;
        buildDfabtn.disabled = false;
        return;
    }

    let currentStateName = startStateName;
    let currentNode = document.getElementById(`node-${currentStateName}`);
    if(currentNode) currentNode.classList.add('active');

    await sleep(800);

    const characters = inputStr.length === 0 ? [] : [...inputStr];

    for (let i = 0; i < characters.length; i++) {
        const char = characters[i];
        const cell = tapeCells[i];

        cell.classList.add('active');

        const transition = currentDFA.transitions.find(t => t.from === currentStateName && t.symbols.includes(char));
        
        if (!transition) {
            resultDisplay.textContent = `REJECTED (No transition from ${currentStateName} for '${char}')`;
            resultDisplay.className = 'result rejected';
            runBtn.disabled = false;
            testStringInput.disabled = false;
            buildDfabtn.disabled = false;
            return;
        }

        const edgeId = `edge-${currentStateName}-${transition.to}`;
        const edgeG = document.getElementById(edgeId);

        if (edgeG) edgeG.classList.add('active');

        await sleep(1000);

        if(currentNode) currentNode.classList.remove('active');
        if (edgeG) edgeG.classList.remove('active');

        currentStateName = transition.to;
        currentNode = document.getElementById(`node-${currentStateName}`);
        if(currentNode) currentNode.classList.add('active');

        cell.classList.remove('active');
        cell.classList.add('processed');
    }

    await sleep(500);

    const finalState = currentDFA.states[currentStateName];
    const isAccepted = finalState && finalState.isAccept;

    if (isAccepted) {
        resultDisplay.textContent = 'ACCEPTED';
        resultDisplay.className = 'result accepted';
    } else {
        resultDisplay.textContent = 'REJECTED';
        resultDisplay.className = 'result rejected';
    }

    runBtn.disabled = false;
    testStringInput.disabled = false;
    buildDfabtn.disabled = false;
}

// init
buildDFA();
