document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const addProcessForm = document.getElementById('add-process-form');
    const arrivalTimeInput = document.getElementById('arrival-time');
    const burstTimeInput = document.getElementById('burst-time');
    const processTableBody = document.getElementById('process-table-body');

    const schedulingTypeRadios = document.querySelectorAll('input[name="scheduling-type"]');
    const algorithmSelect = document.getElementById('algorithm-select');
    const timeQuantumContainer = document.getElementById('time-quantum-container');
    const timeQuantumInput = document.getElementById('time-quantum');

    const runBtn = document.getElementById('run-simulation');
    const resetBtn = document.getElementById('reset-simulation');

    // Results Elements
    const resultsContainer = document.getElementById('results-container');
    const ganttChart = document.getElementById('gantt-chart');
    const avgWaitingTimeEl = document.getElementById('avg-waiting-time');
    const avgTurnaroundTimeEl = document.getElementById('avg-turnaround-time');
    const resultsTableBody = document.getElementById('results-table-body');

    let processes = [];
    let processIdCounter = 1;

    const algorithms = {
        'non-preemptive': [
            { value: 'fcfs', text: 'First-Come, First-Serve (FCFS)' },
            { value: 'sjf', text: 'Shortest Job First (SJF - Non-Preemptive)' }
        ],
        'preemptive': [
            { value: 'srtf', text: 'Shortest Remaining Time First (SRTF)' },
            { value: 'rr', text: 'Round Robin (RR)' }
        ]
    };

    // Color palette for Gantt chart blocks
    const colors = [
        '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f97316',
        '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#d946ef'
    ];

    // --- UI LOGIC ---

    function updateAlgorithmOptions() {
        const selectedType = document.querySelector('input[name="scheduling-type"]:checked').value;
        algorithmSelect.innerHTML = '';
        algorithms[selectedType].forEach(algo => {
            const option = document.createElement('option');
            option.value = algo.value;
            option.textContent = algo.text;
            algorithmSelect.appendChild(option);
        });
        // Trigger change to update visibility of time quantum
        algorithmSelect.dispatchEvent(new Event('change'));
    }

    schedulingTypeRadios.forEach(radio => {
        radio.addEventListener('change', updateAlgorithmOptions);
    });

    algorithmSelect.addEventListener('change', () => {
        if (algorithmSelect.value === 'rr') {
            timeQuantumContainer.classList.remove('hidden');
        } else {
            timeQuantumContainer.classList.add('hidden');
        }
    });

    // --- CORE LOGIC ---

    function addSampleProcesses() {
        const sampleData = [
            { arrival: 0, burst: 8 }, { arrival: 1, burst: 4 },
            { arrival: 2, burst: 9 }, { arrival: 3, burst: 5 },
        ];
        sampleData.forEach(p => addProcess(p.arrival, p.burst));
    }

    function addProcess(arrivalTime, burstTime) {
        const process = {
            id: processIdCounter++, arrivalTime: parseInt(arrivalTime),
            burstTime: parseInt(burstTime)
        };
        processes.push(process);
        renderProcessTable();
    }

    function renderProcessTable() {
        processTableBody.innerHTML = '';
        if (processes.length === 0) {
            processTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">No processes added.</td></tr>`;
        } else {
            processes.forEach(p => {
                const row = document.createElement('tr');
                row.innerHTML = `<td class="px-6 py-4 whitespace-nowrap">P${p.id}</td>
                         <td class="px-6 py-4 whitespace-nowrap">${p.arrivalTime}</td>
                         <td class="px-6 py-4 whitespace-nowrap">${p.burstTime}</td>`;
                processTableBody.appendChild(row);
            });
        }
    }

    addProcessForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const arrivalTime = arrivalTimeInput.value;
        const burstTime = burstTimeInput.value;
        if (burstTime > 0) {
            addProcess(arrivalTime, burstTime);
            arrivalTimeInput.value = parseInt(arrivalTime) + 1;
            burstTimeInput.value = Math.floor(Math.random() * 10) + 1;
            arrivalTimeInput.focus();
        } else {
            alert("Burst time must be greater than 0.");
        }
    });

    runBtn.addEventListener('click', () => {
        if (processes.length === 0) {
            alert("Please add at least one process."); return;
        }
        const algorithm = algorithmSelect.value;
        let results;
        switch (algorithm) {
            case 'fcfs': results = runFCFS(); break;
            case 'sjf': results = runSJF(); break;
            case 'srtf': results = runSRTF(); break;
            case 'rr': results = runRR(); break;
        }
        if (results) displayResults(results);
    });

    resetBtn.addEventListener('click', () => {
        processes = []; processIdCounter = 1;
        renderProcessTable();
        resultsContainer.classList.add('opacity-0');
    });

    // --- ALGORITHMS ---

    function runFCFS() {
        const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime || a.id - b.id);
        let currentTime = 0; let ganttData = [];
        sortedProcesses.forEach(p => {
            if (currentTime < p.arrivalTime) {
                ganttData.push({ id: 'Idle', start: currentTime, end: p.arrivalTime });
                currentTime = p.arrivalTime;
            }
            p.completionTime = currentTime + p.burstTime;
            p.turnaroundTime = p.completionTime - p.arrivalTime;
            p.waitingTime = p.turnaroundTime - p.burstTime;
            ganttData.push({ id: p.id, start: currentTime, end: p.completionTime });
            currentTime = p.completionTime;
        });
        return { processes: sortedProcesses, ganttData };
    }

    function runSJF() {
        let tempProcesses = JSON.parse(JSON.stringify(processes));
        tempProcesses.sort((a, b) => a.arrivalTime - b.arrivalTime || a.id - b.id);
        let completedProcesses = []; let ganttData = [];
        let currentTime = 0; let readyQueue = [];
        while (tempProcesses.length > 0 || readyQueue.length > 0) {
            while (tempProcesses.length > 0 && tempProcesses[0].arrivalTime <= currentTime) {
                readyQueue.push(tempProcesses.shift());
            }
            readyQueue.sort((a, b) => a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime || a.id - b.id);
            if (readyQueue.length === 0) {
                if(tempProcesses.length > 0) {
                    ganttData.push({ id: 'Idle', start: currentTime, end: tempProcesses[0].arrivalTime });
                    currentTime = tempProcesses[0].arrivalTime;
                }
            } else {
                const currentProcess = readyQueue.shift();
                currentProcess.completionTime = currentTime + currentProcess.burstTime;
                currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
                currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
                ganttData.push({ id: currentProcess.id, start: currentTime, end: currentProcess.completionTime });
                currentTime = currentProcess.completionTime;
                completedProcesses.push(currentProcess);
            }
        }
        return { processes: completedProcesses, ganttData };
    }

    function runSRTF() {
        let tempProcesses = JSON.parse(JSON.stringify(processes));
        tempProcesses.forEach(p => p.remainingTime = p.burstTime);
        let completedProcesses = []; let ganttData = [];
        let currentTime = 0;
        const totalProcesses = tempProcesses.length;

        while (completedProcesses.length < totalProcesses) {
            const readyQueue = tempProcesses.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);
            if (readyQueue.length === 0) {
                const nextArrival = Math.min(...tempProcesses.filter(p=>p.remainingTime > 0).map(p => p.arrivalTime));
                if(nextArrival > currentTime) {
                    ganttData.push({ id: 'Idle', start: currentTime, end: nextArrival });
                    currentTime = nextArrival;
                }
                continue;
            }
            readyQueue.sort((a, b) => a.remainingTime - b.remainingTime || a.arrivalTime - b.arrivalTime || a.id - b.id);
            const currentProcess = readyQueue[0];
            const startTime = currentTime;
            currentTime++;
            currentProcess.remainingTime--;
            ganttData.push({ id: currentProcess.id, start: startTime, end: currentTime });

            if (currentProcess.remainingTime === 0) {
                currentProcess.completionTime = currentTime;
                currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
                currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
                completedProcesses.push(currentProcess);
            }
        }
        return { processes: completedProcesses, ganttData: consolidateGanttData(ganttData) };
    }

    function runRR() {
        const timeQuantum = parseInt(timeQuantumInput.value);
        if (isNaN(timeQuantum) || timeQuantum <= 0) {
            alert("Please enter a valid Time Quantum greater than 0.");
            return;
        }
        let tempProcesses = JSON.parse(JSON.stringify(processes));
        tempProcesses.sort((a,b) => a.arrivalTime - b.arrivalTime || a.id - b.id);
        tempProcesses.forEach(p => p.remainingTime = p.burstTime);
        let completedProcesses = []; let ganttData = [];
        let currentTime = 0; let readyQueue = [];
        let processQueue = [...tempProcesses];

        while (processQueue.length > 0 || readyQueue.length > 0) {
            while(processQueue.length > 0 && processQueue[0].arrivalTime <= currentTime) {
                readyQueue.push(processQueue.shift());
            }
            if (readyQueue.length === 0) {
                if (processQueue.length > 0) {
                    const nextArrival = processQueue[0].arrivalTime;
                    ganttData.push({ id: 'Idle', start: currentTime, end: nextArrival });
                    currentTime = nextArrival;
                }
                continue;
            }
            const currentProcess = readyQueue.shift();
            const executionTime = Math.min(timeQuantum, currentProcess.remainingTime);
            ganttData.push({ id: currentProcess.id, start: currentTime, end: currentTime + executionTime });
            currentTime += executionTime;
            currentProcess.remainingTime -= executionTime;

            while(processQueue.length > 0 && processQueue[0].arrivalTime <= currentTime) {
                readyQueue.push(processQueue.shift());
            }
            if (currentProcess.remainingTime > 0) {
                readyQueue.push(currentProcess);
            } else {
                currentProcess.completionTime = currentTime;
                currentProcess.turnaroundTime = currentProcess.completionTime - currentProcess.arrivalTime;
                currentProcess.waitingTime = currentProcess.turnaroundTime - currentProcess.burstTime;
                completedProcesses.push(currentProcess);
            }
        }
        return { processes: completedProcesses, ganttData: consolidateGanttData(ganttData) };
    }

    // --- RESULTS DISPLAY ---

    function displayResults({ processes, ganttData }) {
        const totalWaitingTime = processes.reduce((acc, p) => acc + p.waitingTime, 0);
        const totalTurnaroundTime = processes.reduce((acc, p) => acc + p.turnaroundTime, 0);
        avgWaitingTimeEl.textContent = (totalWaitingTime / processes.length).toFixed(2);
        avgTurnaroundTimeEl.textContent = (totalTurnaroundTime / processes.length).toFixed(2);
        renderGanttChart(ganttData);
        renderResultsTable(processes);
        resultsContainer.classList.remove('opacity-0');
    }

    function consolidateGanttData(ganttData) {
        if (ganttData.length === 0) return [];
        const consolidated = [ganttData[0]];
        for (let i = 1; i < ganttData.length; i++) {
            const lastEntry = consolidated[consolidated.length - 1];
            const currentEntry = ganttData[i];
            if (currentEntry.id === lastEntry.id) {
                lastEntry.end = currentEntry.end;
            } else {
                consolidated.push(currentEntry);
            }
        }
        return consolidated;
    }

    function renderGanttChart(ganttData) {
        ganttChart.innerHTML = '';
        if (ganttData.length === 0) return;
        const totalDuration = ganttData[ganttData.length - 1].end;
        ganttChart.innerHTML += `<span class="gantt-start-time">0</span>`;
        ganttData.forEach(item => {
            const block = document.createElement('div');
            const duration = item.end - item.start;
            const widthPercentage = (duration / totalDuration) * 100;
            block.className = 'gantt-block';
            block.style.width = `${widthPercentage}%`;
            if (item.id === 'Idle') {
                block.style.backgroundColor = '#9ca3af';
                block.textContent = 'Idle';
                block.classList.add('italic');
            } else {
                block.style.backgroundColor = colors[(item.id - 1) % colors.length];
                block.textContent = `P${item.id}`;
            }
            block.innerHTML += `<span class="gantt-time">${item.end}</span>`;
            ganttChart.appendChild(block);
        });
    }

    function renderResultsTable(completedProcesses) {
        resultsTableBody.innerHTML = '';
        completedProcesses.sort((a,b) => a.id - b.id).forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="px-4 py-3 whitespace-nowrap">P${p.id}</td>
                       <td class="px-4 py-3 whitespace-nowrap">${p.arrivalTime}</td>
                       <td class="px-4 py-3 whitespace-nowrap">${p.burstTime}</td>
                       <td class="px-4 py-3 whitespace-nowrap">${p.completionTime}</td>
                       <td class="px-4 py-3 whitespace-nowrap">${p.turnaroundTime}</td>
                       <td class="px-4 py-3 whitespace-nowrap">${p.waitingTime}</td>`;
            resultsTableBody.appendChild(row);
        });
    }

    // --- INITIAL SETUP ---
    updateAlgorithmOptions();
    addSampleProcesses();
    renderProcessTable();
});