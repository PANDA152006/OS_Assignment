document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const addProcessForm = document.getElementById('add-process-form');
  const arrivalTimeInput = document.getElementById('arrival-time');
  const burstTimeInput = document.getElementById('burst-time');
  const processTableBody = document.getElementById('process-table-body');
  const algorithmSelect = document.getElementById('algorithm-select');
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

  // Color palette for Gantt chart blocks
  const colors = [
    '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f97316',
    '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#d946ef'
  ];

  // Add sample processes for demonstration
  function addSampleProcesses() {
    const sampleData = [
      { arrival: 0, burst: 8 },
      { arrival: 1, burst: 4 },
      { arrival: 2, burst: 9 },
      { arrival: 3, burst: 5 },
    ];
    sampleData.forEach(p => addProcess(p.arrival, p.burst));
  }

  // Function to add a process to the list
  function addProcess(arrivalTime, burstTime) {
    const process = {
      id: processIdCounter++,
      arrivalTime: parseInt(arrivalTime),
      burstTime: parseInt(burstTime)
    };
    processes.push(process);
    renderProcessTable();
  }

  // Function to render the process list table
  function renderProcessTable() {
    processTableBody.innerHTML = '';
    if (processes.length === 0) {
      processTableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-500">No processes added.</td></tr>`;
    } else {
      processes.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
                            <td class="px-6 py-4 whitespace-nowrap">P${p.id}</td>
                            <td class="px-6 py-4 whitespace-nowrap">${p.arrivalTime}</td>
                            <td class="px-6 py-4 whitespace-nowrap">${p.burstTime}</td>
                        `;
        processTableBody.appendChild(row);
      });
    }
  }

  // Event listener for adding a process
  addProcessForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const arrivalTime = arrivalTimeInput.value;
    const burstTime = burstTimeInput.value;
    if (burstTime > 0) {
      addProcess(arrivalTime, burstTime);
      // Reset form and focus for next entry
      arrivalTimeInput.value = parseInt(arrivalTime) + 1;
      burstTimeInput.value = Math.floor(Math.random() * 10) + 1;
      arrivalTimeInput.focus();
    } else {
      alert("Burst time must be greater than 0.");
    }
  });

  // Event listener for running the simulation
  runBtn.addEventListener('click', () => {
    if (processes.length === 0) {
      alert("Please add at least one process.");
      return;
    }

    const algorithm = algorithmSelect.value;
    let results;

    if (algorithm === 'fcfs') {
      results = runFCFS();
    } else if (algorithm === 'sjf') {
      results = runSJF();
    }

    displayResults(results);
  });

  // Event listener for resetting the simulation
  resetBtn.addEventListener('click', () => {
    processes = [];
    processIdCounter = 1;
    renderProcessTable();
    resultsContainer.classList.add('opacity-0');
  });

  // FCFS Algorithm Implementation
  function runFCFS() {
    // Sort processes by arrival time
    const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
    let currentTime = 0;
    let ganttData = [];

    sortedProcesses.forEach(p => {
      if (currentTime < p.arrivalTime) {
        // Add idle time to Gantt chart
        ganttData.push({ id: 'Idle', start: currentTime, end: p.arrivalTime });
        currentTime = p.arrivalTime;
      }

      p.startTime = currentTime;
      p.completionTime = currentTime + p.burstTime;
      p.turnaroundTime = p.completionTime - p.arrivalTime;
      p.waitingTime = p.turnaroundTime - p.burstTime;

      ganttData.push({ id: p.id, start: currentTime, end: p.completionTime });

      currentTime = p.completionTime;
    });

    return { processes: sortedProcesses, ganttData };
  }

  // SJF (Non-Preemptive) Algorithm Implementation
  function runSJF() {
    let tempProcesses = JSON.parse(JSON.stringify(processes));
    tempProcesses.sort((a, b) => a.arrivalTime - b.arrivalTime);

    let completedProcesses = [];
    let ganttData = [];
    let currentTime = 0;
    let readyQueue = [];

    while (tempProcesses.length > 0 || readyQueue.length > 0) {
      // Move processes that have arrived to the ready queue
      while (tempProcesses.length > 0 && tempProcesses[0].arrivalTime <= currentTime) {
        readyQueue.push(tempProcesses.shift());
      }

      // Sort ready queue by burst time (SJF)
      readyQueue.sort((a, b) => a.burstTime - b.burstTime);

      if (readyQueue.length === 0) {
        // If no process is ready, there is idle time
        if(tempProcesses.length > 0) {
          ganttData.push({ id: 'Idle', start: currentTime, end: tempProcesses[0].arrivalTime });
          currentTime = tempProcesses[0].arrivalTime;
        }
      } else {
        // Execute the shortest job
        const currentProcess = readyQueue.shift();

        currentProcess.startTime = currentTime;
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

  // Function to display all results
  function displayResults({ processes, ganttData }) {
    // Calculate averages
    const totalWaitingTime = processes.reduce((acc, p) => acc + p.waitingTime, 0);
    const totalTurnaroundTime = processes.reduce((acc, p) => acc + p.turnaroundTime, 0);
    const avgWaitingTime = totalWaitingTime / processes.length;
    const avgTurnaroundTime = totalTurnaroundTime / processes.length;

    avgWaitingTimeEl.textContent = avgWaitingTime.toFixed(2);
    avgTurnaroundTimeEl.textContent = avgTurnaroundTime.toFixed(2);

    // Render tables and chart
    renderGanttChart(ganttData);
    renderResultsTable(processes);

    resultsContainer.classList.remove('opacity-0');
  }

  // Function to render the Gantt chart
  function renderGanttChart(ganttData) {
    ganttChart.innerHTML = '';
    const totalDuration = ganttData[ganttData.length - 1].end;

    ganttChart.innerHTML += `<span class="gantt-start-time">0</span>`;

    ganttData.forEach(item => {
      const block = document.createElement('div');
      const duration = item.end - item.start;
      const widthPercentage = (duration / totalDuration) * 100;

      block.className = 'gantt-block';
      block.style.width = `${widthPercentage}%`;

      if (item.id === 'Idle') {
        block.style.backgroundColor = '#9ca3af'; // Gray for idle
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

  // Function to render the detailed results table
  function renderResultsTable(completedProcesses) {
    resultsTableBody.innerHTML = '';
    // Sort by process ID for consistent display
    completedProcesses.sort((a,b) => a.id - b.id).forEach(p => {
      const row = document.createElement('tr');
      row.innerHTML = `
                        <td class="px-4 py-3 whitespace-nowrap">P${p.id}</td>
                        <td class="px-4 py-3 whitespace-nowrap">${p.arrivalTime}</td>
                        <td class="px-4 py-3 whitespace-nowrap">${p.burstTime}</td>
                        <td class="px-4 py-3 whitespace-nowrap">${p.completionTime}</td>
                        <td class="px-4 py-3 whitespace-nowrap">${p.turnaroundTime}</td>
                        <td class="px-4 py-3 whitespace-nowrap">${p.waitingTime}</td>
                    `;
      resultsTableBody.appendChild(row);
    });
  }

  // Initial setup
  addSampleProcesses();
  renderProcessTable();
});
