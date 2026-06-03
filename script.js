const get = id => document.getElementById(id);

let fieldData = {
  fields: [],
  stock: {
    fertilizer: { urea: 100, dap: 100, npk: 100 },
    pesticide: { sprayA: 50, sprayB: 50 },
  },
};

let machineryData = { machines: [] };

let stockData = {
  fuel: 0,
  fertilizer: { urea: 0, dap: 0, npk: 0 },
  pesticide: { sprayA: 0, sprayB: 0 },
  history: [],
};

let workerData = { workers: [] };

const loadData = () => {
  const storedFieldData = localStorage.getItem('fieldERP');
  const storedMachineryData = localStorage.getItem('machineryERP');
  const storedStockData = localStorage.getItem('agriERP');
  const storedWorkerData = localStorage.getItem('workerERP');

  if (storedFieldData) fieldData = JSON.parse(storedFieldData);
  if (storedMachineryData) machineryData = JSON.parse(storedMachineryData);
  if (storedStockData) stockData = JSON.parse(storedStockData);
  if (storedWorkerData) workerData = JSON.parse(storedWorkerData);
};

const saveFieldData = () => localStorage.setItem('fieldERP', JSON.stringify(fieldData));
const saveMachineryData = () => localStorage.setItem('machineryERP', JSON.stringify(machineryData));
const saveStockData = () => localStorage.setItem('agriERP', JSON.stringify(stockData));
const saveWorkerData = () => localStorage.setItem('workerERP', JSON.stringify(workerData));

const showSection = sectionName => {
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.toggle('active', section.dataset.section === sectionName);
  });

  document.querySelectorAll('.top-nav a').forEach(link => {
    link.classList.toggle('active', link.dataset.section === sectionName);
  });

  if (location.hash !== `#${sectionName}`) {
    history.replaceState(null, '', `#${sectionName}`);
  }
};

const renderFieldList = () => {
  const list = get('fieldList');
  if (!list) return;

  let html = '<h2>Fields</h2>';

  fieldData.fields.forEach((field, index) => {
    html += `
      <div class="card module-list">
        <b>${field.name}</b> (${field.crop})<br />
        Supervisor: ${field.supervisor}<br />
        ${field.plant} → ${field.harvest}<br />
        Fertilizer: ${field.fertilizer.type} (${field.fertilizer.qty})<br />
        Pesticide: ${field.pesticide.type} (${field.pesticide.qty})<br /><br />
        <button data-field-delete="${index}">Delete</button>
      </div>`;
  });

  list.innerHTML = html;
};

const addField = () => {
  const name = get('fname').value;
  const crop = get('crop').value;
  const supervisor = get('supervisor').value;
  const plant = get('plant').value;
  const harvest = get('harvest').value;
  const fertilizerType = get('fertType').value;
  const pesticideType = get('pestType').value;
  const fertilizerQty = Number(get('fertQty').value) || 0;
  const pesticideQty = Number(get('pestQty').value) || 0;

  if (!name || !crop || !supervisor || !plant || !harvest) {
    alert('Fill all fields');
    return;
  }

  if (fertilizerQty <= 0 || pesticideQty <= 0) {
    alert('Enter valid quantity');
    return;
  }

  // Check central stock (stockData) so Stock page stays up-to-date
  if ((stockData.fertilizer[fertilizerType] || 0) < fertilizerQty) {
    alert('Not enough fertilizer in stock');
    return;
  }

  if ((stockData.pesticide[pesticideType] || 0) < pesticideQty) {
    alert('Not enough pesticide in stock');
    return;
  }

  stockData.fertilizer[fertilizerType] -= fertilizerQty;
  stockData.pesticide[pesticideType] -= pesticideQty;
  logStockHistory('Fertilizer Used', fertilizerType, fertilizerQty);
  logStockHistory('Pesticide Used', pesticideType, pesticideQty);
  saveStockData();

  fieldData.fields.push({
    name,
    crop,
    supervisor,
    plant,
    harvest,
    fertilizer: { type: fertilizerType, qty: fertilizerQty },
    pesticide: { type: pesticideType, qty: pesticideQty },
  });

  saveFieldData();
  renderFieldList();

  get('fname').value = '';
  get('crop').value = '';
  get('supervisor').value = '';
  get('plant').value = '';
  get('harvest').value = '';
  get('fertQty').value = '';
  get('pestQty').value = '';
};

const deleteField = index => {
  const field = fieldData.fields[index];

  if (field) {
    // return used quantities to central stock
    if (stockData.fertilizer[field.fertilizer.type] != null) stockData.fertilizer[field.fertilizer.type] += field.fertilizer.qty;
    if (stockData.pesticide[field.pesticide.type] != null) stockData.pesticide[field.pesticide.type] += field.pesticide.qty;
  }

  fieldData.fields.splice(index, 1);

  saveFieldData();
  saveStockData();
  renderFieldList();
  renderStock();
};

const renderMachineryList = () => {
  const list = get('machineList');
  if (!list) return;

  let html = '<h2>Machines</h2>';

  machineryData.machines.forEach((machine, index) => {
    html += `
      <div class="card module-list">
        <b>${machine.name}</b> (ID: ${machine.id})<br />
        Meter: ${machine.startMeter} → ${machine.endMeter} (Used: ${machine.meterDiff})<br />
        Fuel: ${machine.fuel}<br />
        Field: <b>${machine.field}</b><br />
        Worker: ${machine.worker}<br />
        Date: ${machine.date}<br /><br />
        <button data-machine-delete="${index}">Delete</button>
      </div>`;
  });

  list.innerHTML = html;
};

const addMachine = () => {
  const machineField = get('machineField').value.trim();

  if (machineField === '') {
    alert('Field is required!');
    return;
  }

  const machine = {
    id: get('mid').value,
    name: get('mname').value,
    startMeter: Number(get('startMeter').value) || 0,
    endMeter: Number(get('endMeter').value) || 0,
    fuel: Number(get('fuel').value) || 0,
    field: machineField,
    worker: get('machineWorker').value,
    date: get('date').value,
  };

  machine.meterDiff = machine.endMeter - machine.startMeter;
  // Check and deduct fuel from central stock if provided
  if (machine.fuel > 0) {
    if ((stockData.fuel || 0) < machine.fuel) {
      alert('Not enough fuel in stock for this assignment');
      return;
    }
    stockData.fuel -= machine.fuel;
    logStockHistory('Fuel Used', 'Fuel', machine.fuel);
    saveStockData();
  }

  machineryData.machines.push(machine);
  saveMachineryData();
  renderMachineryList();
  renderStock();

  get('mid').value = '';
  get('mname').value = '';
  get('startMeter').value = '';
  get('endMeter').value = '';
  get('fuel').value = '';
  get('machineField').value = '';
  get('machineWorker').value = '';
  get('date').value = '';
};

const deleteMachine = index => {
  const m = machineryData.machines[index];
  if (m) {
    // return fuel used by this machine assignment back to stock
    if (m.fuel && m.fuel > 0) {
      stockData.fuel = (stockData.fuel || 0) + m.fuel;
      saveStockData();
      renderStock();
    }
  }

  machineryData.machines.splice(index, 1);
  saveMachineryData();
  renderMachineryList();
};

const renderStock = () => {
  const fuelStock = get('fuelStock');
  if (!fuelStock) return;

  get('fuelStock').innerText = stockData.fuel;
  get('urea').innerText = stockData.fertilizer.urea;
  get('dap').innerText = stockData.fertilizer.dap;
  get('npk').innerText = stockData.fertilizer.npk;
  get('sprayA').innerText = stockData.pesticide.sprayA;
  get('sprayB').innerText = stockData.pesticide.sprayB;

  let html = '';

  // render history newest first and include delete buttons
  for (let i = stockData.history.length - 1; i >= 0; i--) {
    const historyItem = stockData.history[i];
    html += `
      <div class="card module-list">
        <b>${historyItem.type}</b><br />
        📦 ${historyItem.item} - ${historyItem.qty}<br />
        📅 ${historyItem.date}<br />
        <button data-history-delete="${i}">Delete</button>
      </div>`;
  }

  get('history').innerHTML = html;
};

const deleteHistory = index => {
  const h = stockData.history[index];
  if (!h) return;

  // revert stock based on history type
  if (h.type === 'Fuel Added') {
    stockData.fuel = Math.max(0, stockData.fuel - h.qty);
  } else if (h.type === 'Fuel Used') {
    stockData.fuel += h.qty;
  } else if (h.type === 'Fertilizer Added') {
    if (stockData.fertilizer[h.item] != null)
      stockData.fertilizer[h.item] = Math.max(0, stockData.fertilizer[h.item] - h.qty);
  } else if (h.type === 'Fertilizer Used') {
    if (stockData.fertilizer[h.item] != null) stockData.fertilizer[h.item] += h.qty;
  } else if (h.type === 'Pesticide Added') {
    if (stockData.pesticide[h.item] != null)
      stockData.pesticide[h.item] = Math.max(0, stockData.pesticide[h.item] - h.qty);
  } else if (h.type === 'Pesticide Used') {
    if (stockData.pesticide[h.item] != null) stockData.pesticide[h.item] += h.qty;
  }

  stockData.history.splice(index, 1);
  saveStockData();
  renderStock();
};

const logStockHistory = (type, item, qty) => {
  stockData.history.push({
    type,
    item,
    qty,
    date: new Date().toLocaleDateString(),
  });
};

const addFuelStock = () => {
  const value = Number(get('addFuel').value) || 0;
  stockData.fuel += value;
  logStockHistory('Fuel Added', 'Fuel', value);
  get('addFuel').value = '';
  saveStockData();
  renderStock();
};

const addFertilizer = () => {
  const value = Number(get('fertQtyStock').value) || 0;
  const type = get('fertTypeStock').value;
  stockData.fertilizer[type] += value;
  logStockHistory('Fertilizer Added', type, value);
  get('fertQtyStock').value = '';
  saveStockData();
  renderStock();
};

const addPesticide = () => {
  const value = Number(get('pestQtyStock').value) || 0;
  const type = get('pestTypeStock').value;
  stockData.pesticide[type] += value;
  logStockHistory('Pesticide Added', type, value);
  get('pestQtyStock').value = '';
  saveStockData();
  renderStock();
};

const useFuelStock = () => {
  const value = Number(get('useFuel').value) || 0;
  if (value > stockData.fuel) return alert('Not enough fuel');
  stockData.fuel -= value;
  logStockHistory('Fuel Used', 'Fuel', value);
  get('useFuel').value = '';
  saveStockData();
  renderStock();
};

const useFertilizer = () => {
  const value = Number(get('useFertQty').value) || 0;
  const type = get('useFertType').value;
  if (value > stockData.fertilizer[type]) return alert('Not enough stock');
  stockData.fertilizer[type] -= value;
  logStockHistory('Fertilizer Used', type, value);
  get('useFertQty').value = '';
  saveStockData();
  renderStock();
};

const usePesticide = () => {
  const value = Number(get('usePestQty').value) || 0;
  const type = get('usePestType').value;
  if (value > stockData.pesticide[type]) return alert('Not enough stock');
  stockData.pesticide[type] -= value;
  logStockHistory('Pesticide Used', type, value);
  get('usePestQty').value = '';
  saveStockData();
  renderStock();
};

const renderWorkerList = () => {
  const list = get('workerList');
  if (!list) return;

  let html = '';

  workerData.workers.forEach(worker => {
    html += `
      <div class="card worker-card module-list">
        <h3>👷 ${worker.name}</h3>
        <b>CNIC:</b> ${worker.cnic}<br />
        <b>Phone:</b> ${worker.phone}<br />
        <b>Daily Salary:</b> ${worker.salary}<br /><br />
        <button data-worker-attendance="${worker.id}">✔ Mark Attendance</button>
        <button data-worker-delete="${worker.id}">🗑 Delete</button>
        <h4>📅 Attendance</h4>
        ${worker.attendance.length ? worker.attendance.map(date => '• ' + date).join('<br />') : 'No attendance'}
        <br /><br />
        <h3>💰 Total Salary: ${worker.attendance.length * worker.salary}</h3>
      </div>`;
  });

  list.innerHTML = html;
};

const addWorker = () => {
  const name = get('name').value.trim();
  const cnic = get('cnic').value.trim();
  const phone = get('phone').value.trim();
  const salary = Number(get('salary').value) || 0;

  if (name === '' || cnic === '') {
    alert('Name & CNIC required');
    return;
  }

  workerData.workers.push({
    id: Date.now(),
    name,
    cnic,
    phone,
    salary,
    attendance: [],
  });

  saveWorkerData();
  renderWorkerList();

  get('name').value = '';
  get('cnic').value = '';
  get('phone').value = '';
  get('salary').value = '';
};

const deleteWorker = id => {
  if (!confirm('Delete this worker?')) return;
  workerData.workers = workerData.workers.filter(worker => worker.id !== id);
  saveWorkerData();
  renderWorkerList();
};

const markAttendance = id => {
  const today = new Date().toISOString().split('T')[0];
  const worker = workerData.workers.find(item => item.id === id);

  if (worker.attendance.includes(today)) {
    alert('Already marked today!');
    return;
  }

  worker.attendance.push(today);
  saveWorkerData();
  renderWorkerList();
};

const bindEvents = () => {
  document.querySelectorAll('.top-nav a[data-section]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      showSection(link.dataset.section);
    });
  });

  document.querySelectorAll('[data-go]').forEach(button => {
    button.addEventListener('click', () => showSection(button.dataset.go));
  });

  get('addFieldBtn').addEventListener('click', addField);
  get('addMachineBtn').addEventListener('click', addMachine);
  get('addFuelBtn').addEventListener('click', addFuelStock);
  get('addFertilizerBtn').addEventListener('click', addFertilizer);
  get('addPesticideBtn').addEventListener('click', addPesticide);
  get('useFuelBtn').addEventListener('click', useFuelStock);
  get('useFertilizerBtn').addEventListener('click', useFertilizer);
  get('usePesticideBtn').addEventListener('click', usePesticide);
  get('addWorkerBtn').addEventListener('click', addWorker);

  document.addEventListener('click', event => {
    const fieldDeleteButton = event.target.closest('[data-field-delete]');
    const machineDeleteButton = event.target.closest('[data-machine-delete]');
    const workerAttendanceButton = event.target.closest('[data-worker-attendance]');
    const workerDeleteButton = event.target.closest('[data-worker-delete]');
      const historyDeleteButton = event.target.closest('[data-history-delete]');

    if (fieldDeleteButton) deleteField(Number(fieldDeleteButton.dataset.fieldDelete));
    if (machineDeleteButton) deleteMachine(Number(machineDeleteButton.dataset.machineDelete));
    if (workerAttendanceButton) markAttendance(Number(workerAttendanceButton.dataset.workerAttendance));
    if (workerDeleteButton) deleteWorker(Number(workerDeleteButton.dataset.workerDelete));
      if (historyDeleteButton) deleteHistory(Number(historyDeleteButton.dataset.historyDelete));
  });

  window.addEventListener('hashchange', () => {
    const sectionName = location.hash.replace('#', '') || 'dashboard';
    showSection(sectionName);
  });
};

const renderAll = () => {
  renderFieldList();
  renderMachineryList();
  renderStock();
  renderWorkerList();
};

loadData();
bindEvents();
renderAll();
showSection(location.hash.replace('#', '') || 'dashboard');
