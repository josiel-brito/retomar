// Simulating a database of users and historical data
const validUsers = [
    { name: "Josiel", matricula: "1234" },
    { name: "Usuário2", matricula: "5678" }
];

const adminUsers = ["Josiel", "Usuário2"]; // Users with permission to delete history

const questions = {
    "Exaustor 1": [
        "Pergunta 1 para SN001 jdhdnndbb jdhdbnbdnbd jdhdnndn?",
        "Pergunta 2 para SN001?"
    ],
    "Exaustor 2": [
        "Pergunta 1 para SN002?",
        "Pergunta 2 para SN002?"
    ]
};

let currentUser = null;
let currentTurno = null;
let currentSerial = null;
let currentResponses = [];
let historico = JSON.parse(localStorage.getItem('historico')) || [];
let sessionResponses = [];
let editIndex = -1;

// Show matricula password toggle
document.getElementById('showMatricula').addEventListener('change', function() {
    const matriculaInput = document.getElementById('matricula');
    matriculaInput.type = this.checked ? 'text' : 'password';
});

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const name = document.getElementById('name').value;
    const matricula = document.getElementById('matricula').value;
    const user = validUsers.find(user => user.name === name && user.matricula === matricula);

    if (user) {
        currentUser = user;
        document.getElementById('userGreeting').textContent = `Olá, ${user.name}`;
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('turnoSeriesContainer').style.display = 'block';
    } else {
        alert('Nome ou matrícula inválidos.');
    }
});

// Handle turno and series form submission
document.getElementById('turnoSeriesForm').addEventListener('submit', function(event) {
    event.preventDefault();
    currentTurno = document.getElementById('turno').value;
    currentSerial = document.getElementById('series').value;

    if (questions[currentSerial]) {
        displayQuestionario(currentSerial);
    } else {
        alert('Número de série inválido.');
    }
});

document.getElementById('openScannerBtn').addEventListener('click', function() {
    document.getElementById('barcodeScanner').style.display = 'block';
    document.getElementById('closeScannerBtn').style.display = 'block';
    startBarcodeScanner();
});

document.getElementById('closeScannerBtn').addEventListener('click', function() {
    stopBarcodeScanner();
    document.getElementById('barcodeScanner').style.display = 'none';
    document.getElementById('closeScannerBtn').style.display = 'none';
});

let barcodeDetector;
let videoStream;

async function startBarcodeScanner() {
    if (!('BarcodeDetector' in window)) {
        console.error('Barcode Detector is not supported by this browser.');
        return;
    }

    barcodeDetector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });

    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const video = document.getElementById('barcodeVideo');
        video.srcObject = videoStream;
        video.play();

        scanBarcode(video);
    } catch (err) {
        console.error('Error accessing the camera: ', err);
    }
}

function scanBarcode(video) {
    const checkForBarcode = async () => {
        if (!barcodeDetector) return;

        try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes.length > 0) {
                document.getElementById('series').value = barcodes[0].rawValue;
                stopBarcodeScanner();
                document.getElementById('barcodeScanner').style.display = 'none';
                document.getElementById('closeScannerBtn').style.display = 'none';
            }
        } catch (err) {
            console.error('Barcode detection failed: ', err);
        }

        requestAnimationFrame(checkForBarcode);
    };

    checkForBarcode();
}

function stopBarcodeScanner() {
    if (videoStream) {
        const tracks = videoStream.getTracks();
        tracks.forEach(track => track.stop());
        videoStream = null;
    }

    barcodeDetector = null;
}

// Display questionario
function displayQuestionario(serial) {
    const container = document.getElementById('questionarioContainer');
    container.innerHTML = `<h2>Questionário para ${serial}</h2>`;

    questions[serial].forEach((question, index) => {
        container.innerHTML += `
            <div>
                <p>${question}</p>
                <select id="response${index}" class="industrial-select">
                    <option value="Normal">Normal</option>
                    <option value="Alerta">Alerta</option>
                    <option value="Crítico">Crítico</option>
                </select>
                <div id="problem${index}" style="display:none;">
                    <label for="problemDescription${index}">Descreva o Problema:</label>
                    <textarea id="problemDescription${index}" class="industrial-textarea"></textarea>
                </div>
            </div>
        `;
    });

    container.innerHTML += `
        <div class="actions">
            <button id="saveQuestionarioBtn" class="industrial-button">Salvar Questionário</button>
        </div>
    `;

    document.getElementById('questionarioContainer').style.display = 'block';

    // Add event listeners to response selects
    questions[serial].forEach((_, index) => {
        document.getElementById(`response${index}`).addEventListener('change', function() {
            const value = this.value;
            const problemDiv = document.getElementById(`problem${index}`);
            if (value === 'Alerta' || value === 'Crítico') {
                problemDiv.style.display = 'block';
            } else {
                problemDiv.style.display = 'none';
            }
        });
    });

    document.getElementById('saveQuestionarioBtn').addEventListener('click', saveQuestionario);
}

function saveQuestionario() {
    let responses = [];
    questions[currentSerial].forEach((_, index) => {
        const response = document.getElementById(`response${index}`).value;
        const problemDescription = document.getElementById(`problemDescription${index}`).value;
        responses.push({ question: questions[currentSerial][index], response, problemDescription });
    });

    if (editIndex !== -1) {
        sessionResponses[editIndex] = {
            serial: currentSerial,
            responses: responses,
            user: currentUser.name,
            turno: currentTurno,
            timestamp: new Date().toLocaleString()
        };
        editIndex = -1;  
    }
     else {
    sessionResponses.push({
        serial: currentSerial,
        responses: responses,
        user: currentUser.name,
        turno: currentTurno,
        timestamp: new Date().toLocaleString()
    });
}
  
updateSeriesRespondidos();

    // Reset the questionario and series input field
    document.getElementById('questionarioContainer').style.display = 'none';
    document.getElementById('turnoSeriesForm').reset();
}

function updateSeriesRespondidos() {
    const container = document.getElementById('seriesRespondidosContainer');
    const list = document.getElementById('seriesRespondidosList');
    list.innerHTML = '';

    sessionResponses.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${item.serial} <button class="industrial-button edit-button" data-index="${index}">Editar</button>`;
        list.appendChild(li);
    });

    container.style.display = 'block';

    document.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', function() {
            editQuestionario(this.getAttribute('data-index'));
        });
    });
}

function editQuestionario(index) {
    editIndex = index;
    const item = sessionResponses[index];
    currentSerial = item.serial;
    currentResponses = item.responses;
    displayQuestionario(currentSerial);

    currentResponses.forEach((response, idx) => {
        document.getElementById(`response${idx}`).value = response.response;
        if (response.response === 'Alerta' || response.response === 'Crítico') {
            document.getElementById(`problem${idx}`).style.display = 'block';
            document.getElementById(`problemDescription${idx}`).value = response.problemDescription;
        }
    });
}

// Handle finalizar button
document.getElementById('finalizarBtn').addEventListener('click', function() {
    historico.push({
        user: currentUser.name,
        turno: currentTurno,
        timestamp: new Date().toLocaleString(),
        responses: sessionResponses
    });

    localStorage.setItem('historico', JSON.stringify(historico));
    displayResultados();
});

function displayResultados() {
    const container = document.getElementById('resultadosContainer');
    const list = document.getElementById('resultadosList');
    list.innerHTML = '';

    sessionResponses.forEach(item => {
        item.responses.forEach(response => {
            if (response.response === 'Alerta' || response.response === 'Crítico') {
                list.innerHTML += `
                    <div>
                        <p><strong>${item.serial}</strong> - ${response.question}</p>
                        <p>Resposta: ${response.response}</p>
                        <p>Descrição do Problema: ${response.problemDescription}</p>
                    </div>
                `;
            }
        });
    });

    document.getElementById('turnoSeriesContainer').style.display = 'none';
    document.getElementById('questionarioContainer').style.display = 'none';
    container.style.display = 'block';
}

// Handle display of historical data
document.getElementById('exibirHistoricosBtn').addEventListener('click', function() {
    const historicoList = document.getElementById('historicoList');
    historicoList.innerHTML = '';

    historico.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<input type="checkbox" class="historico-checkbox" data-index="${index}"> ${item.user} - ${item.turno} - ${item.timestamp}`;
        
        // Add event listener to the entire list item
        li.addEventListener('click', (event) => {
            if (!event.target.matches('.historico-checkbox')) {
                viewHistoricoDetail(index);
            }
        });

        // Prevent the list item click event when clicking on the checkbox
        li.querySelector('.historico-checkbox').addEventListener('click', (event) => {
            event.stopPropagation();
        });

        historicoList.appendChild(li);
    });

    document.getElementById('turnoSeriesContainer').style.display = 'none';
    document.getElementById('historicoContainer').style.display = 'block';

    if (adminUsers.includes(currentUser.name)) {
        document.getElementById('apagarSelecionadosBtn').style.display = 'inline-block';
        document.getElementById('apagarHistoricoBtn').style.display = 'inline-block';
    } else {
        document.getElementById('apagarSelecionadosBtn').style.display = 'none';
        document.getElementById('apagarHistoricoBtn').style.display = 'none';
    }
});
 

function viewHistoricoDetail(index) {
    const item = historico[index];
    const detailContainer = document.getElementById('historicoDetailContainer');
    const detailContent = document.getElementById('historicoDetailContent');

    detailContent.innerHTML = `
        <p>Usuário: ${item.user}</p>
        <p>Turno: ${item.turno}</p>
        <p>Data e Hora: ${item.timestamp}</p>
        <h3>Respostas</h3>
    `;

    item.responses.forEach(serial => {
        detailContent.innerHTML += `<p class="serial-number"><strong>${serial.serial}</strong></p>`;
        serial.responses.forEach(response => {
            detailContent.innerHTML += `
                <div class="response-row">
                    <div class="response-question">${response.question}</div>
                    <div class="response-good" style="background-color: ${response.response === 'Normal' ? '#00FF7F' : '#fff'}">${response.response === 'Normal' ? '✓' : ''}</div>
                    <div class="response-alert" style="background-color: ${response.response === 'Alerta' ? '#FFFF00' : '#fff'}">${response.response === 'Alerta' ? '✓' : ''}</div>
                    <div class="response-critical" style="background-color: ${response.response === 'Crítico' ? '#FF0000' : '#fff'}">${response.response === 'Crítico' ? '✓' : ''}</div>
                </div>
                ${response.problemDescription ? `<p class="response-problem">Descrição do Problema: ${response.problemDescription}</p>` : ''}
            `;
        });
    });

    document.getElementById('historicoContainer').style.display = 'none';
    detailContainer.style.display = 'block';
}

document.getElementById('backToTurnoBtn').addEventListener('click', function() {
    document.getElementById('resultadosContainer').style.display = 'none';
    document.getElementById('turnoSeriesContainer').style.display = 'block';
});

document.getElementById('backToTurnoBtn2').addEventListener('click', function() {
    document.getElementById('historicoContainer').style.display = 'none';
    document.getElementById('turnoSeriesContainer').style.display = 'block';
});

document.getElementById('backToHistoricoBtn').addEventListener('click', function() {
    document.getElementById('historicoDetailContainer').style.display = 'none';
    document.getElementById('historicoContainer').style.display = 'block';
});

// Handle deleting selected historical data
document.getElementById('apagarSelecionadosBtn').addEventListener('click', function() {
    const checkboxes = document.querySelectorAll('.historico-checkbox:checked');
    if (checkboxes.length > 0 && confirm('Tem certeza que deseja apagar os históricos selecionados?')) {
        checkboxes.forEach(checkbox => {
            const index = checkbox.getAttribute('data-index');
            historico.splice(index, 1);
        });
        localStorage.setItem('historico', JSON.stringify(historico));
        alert('Históricos selecionados apagados com sucesso.');
        document.getElementById('exibirHistoricosBtn').click(); // Refresh the list
    }
});

// Handle deleting all historical data
document.getElementById('apagarHistoricoBtn').addEventListener('click', function() {
    if (confirm('Tem certeza que deseja apagar todo o histórico?')) {
        historico = [];
        localStorage.setItem('historico', JSON.stringify(historico));
        alert('Histórico apagado com sucesso.');
        document.getElementById('historicoList').innerHTML = '';
    }
});

document.getElementById('sendResultsBtn').addEventListener('click', function() {
    sendResultsByEmail();
});

function sendResultsByEmail() {
    const recipients = 'example1@gmail.com,example2@gmail.com';
    const subject = 'Relatório diário do check-list';

    // Adicionar informações do usuário, hora e turno
    const currentUserInfo = sessionResponses.length > 0 ? sessionResponses[0] : {};
    const user = currentUserInfo.user || currentUser.name;
    const timestamp = new Date().toLocaleString();
    const turno = currentUserInfo.turno || 'Turno não especificado';

    let body = `Usuário: ${user}\nHora do Envio: ${timestamp}\nTurno: ${turno}\n\nAqui estão os resultados finais:\n\n`;

    sessionResponses.forEach(item => {
        item.responses.forEach(response => {
            if (response.response === 'Alerta' || response.response === 'Crítico') {
                body += `Serial: ${item.serial}\nPergunta: ${response.question}\nResposta: ${response.response}\nDescrição do Problema: ${response.problemDescription}\n\n`;
            }
        });
    });

    const mailtoLink = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
}
