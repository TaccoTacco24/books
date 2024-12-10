function getIPAddress() {
    fetch('https://ipinfo.io/json')
        .then(response => response.json())
        .then(data => {
            const ip = data.ip;
            const ipParts = ip.split('.');
            const ipDetails = document.getElementById('ip-details');
            const ipNumber = document.createElement('div');
            ipNumber.className = 'ip-number';
            ipNumber.textContent = ipParts.join('.');
            ipDetails.appendChild(ipNumber);

            document.getElementById('ip-operator').textContent = data.org || 'N/A';

            const positionElement = document.getElementById('ip-position');
            const country = data.country;
            const flagUrl = `https://www.mio-ip.it/wp-content/themes/mio-ip-child/img/svg_flags/${country.toLowerCase()}.svg`;
            const flagImg = document.createElement('img');
            flagImg.src = flagUrl;
            flagImg.className = 'flag';
            flagImg.alt = `Flag of ${data.country_name || 'Unknown'}`;

            positionElement.textContent = `${data.city}, ${data.region}, ${data.country}`;
            positionElement.appendChild(flagImg);
        })
        .catch(error => {
            document.getElementById('ip-details').textContent = 'Impossibile ottenere l\'indirizzo IP';
            document.getElementById('ip-operator').textContent = 'N/A';
            document.getElementById('ip-position').textContent = 'N/A';
            console.error('Errore nella richiesta:', error);
        });
}

const testFiles = {
    small: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/320px-PNG_transparency_demonstration_1.png',
    medium: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/640px-PNG_transparency_demonstration_1.png',
    large: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/1200px-PNG_transparency_demonstration_1.png'
};

async function measurePing(updateUI) {
    const samples = 5;  // Increased number of samples
    let totalPing = 0;
    let successfulPings = 0;
    
    for (let i = 0; i < samples; i++) {
        const startTime = performance.now();
        try {
            const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
                method: 'GET',
                cache: 'no-store'
            });
            if (response.ok) {
                const endTime = performance.now();
                const currentPing = Math.round(endTime - startTime);
                totalPing += currentPing;
                successfulPings++;
                
                // Update UI with current ping
                document.getElementById('pingValue').textContent = currentPing;
                await updateUI('ping', currentPing, (i + 1) * (100/samples), 100);
            }
        } catch (error) {
            console.error('Errore durante il ping:', error);
        }
        // Add a small delay between pings
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return successfulPings > 0 ? Math.round(totalPing / successfulPings) : 0;
}

async function measureDownloadSpeed(testDuration, startTime, updateUI) {
    let maxSpeedMbps = 0;
    let currentTestSize = 'small';
    let lastSpeedMbps = 0;

    while (performance.now() - startTime < testDuration) {
        try {
            if (lastSpeedMbps > 50 && currentTestSize === 'small') {
                currentTestSize = 'medium';
            } else if (lastSpeedMbps > 100 && currentTestSize === 'medium') {
                currentTestSize = 'large';
            }

            const testFile = testFiles[currentTestSize] + '?r=' + Math.random();
            const startMeasurement = performance.now();
            const response = await fetch(testFile);
            const reader = response.body.getReader();
            let receivedLength = 0;

            while(true) {
                const {done, value} = await reader.read();
                if (done) break;
                receivedLength += value.length;
                const currentTime = performance.now();
                const measurementDuration = (currentTime - startMeasurement) / 1000;
                lastSpeedMbps = (receivedLength * 8) / (1024 * 1024 * measurementDuration);
                
                maxSpeedMbps = Math.max(maxSpeedMbps, lastSpeedMbps);
                await updateUI('download', lastSpeedMbps, currentTime - startTime, testDuration);
            }
        } catch (error) {
            console.error('Errore download:', error);
        }
    }
    return maxSpeedMbps;
}

async function measureUploadSpeed(testDuration, startTime, updateUI) {
    let maxSpeedMbps = 0;
    const chunkSize = 1024 * 1024; // 1MB

    while (performance.now() - startTime < testDuration) {
        try {
            const blob = new Blob([new ArrayBuffer(chunkSize)]);
            const formData = new FormData();
            formData.append('file', blob, 'test.bin');

            const startMeasurement = performance.now();
            await fetch('https://httpbin.org/post', {
                method: 'POST',
                body: formData
            });
            const endMeasurement = performance.now();

            const duration = (endMeasurement - startMeasurement) / 1000;
            const speedMbps = (chunkSize * 8) / (1024 * 1024 * duration);
            maxSpeedMbps = Math.max(maxSpeedMbps, speedMbps);

            const currentTime = performance.now();
            await updateUI('upload', speedMbps, currentTime - startTime, testDuration);
        } catch (error) {
            console.error('Errore upload:', error);
        }
    }
    return maxSpeedMbps;
}

async function updateUI(testType, speed, elapsed, testDuration) {
    const progress = Math.min((elapsed / testDuration) * 100, 100);
    document.querySelector('.progress-fill').style.width = progress + '%';
    
    if (testType === 'ping') {
        document.getElementById('pingValue').textContent = speed + ' ms';
    } else {
        document.getElementById(testType + 'Value').textContent = speed.toFixed(2);
    }
}

async function runTests() {
    const startTestButton = document.getElementById('startTest');
    const progressBar = document.querySelector('.progress-bar');
    const testDuration = 10000;
    
    startTestButton.disabled = true;
    document.getElementById('pingValue').textContent = '-';
    document.getElementById('downloadValue').textContent = '-';
    document.getElementById('uploadValue').textContent = '-';
    document.querySelector('.progress-fill').style.width = '0%';
    progressBar.style.display = 'block';

    document.getElementById('pingValue').textContent = 'Misurando Ping...';
    const ping = await measurePing(updateUI);
    document.getElementById('pingValue').textContent = ping;

    document.getElementById('downloadValue').textContent = 'Misurando Download...';
    const startDownload = performance.now();
    const maxDownloadSpeed = await measureDownloadSpeed(testDuration, startDownload, updateUI);
    document.getElementById('downloadValue').textContent = maxDownloadSpeed.toFixed(2);

    document.getElementById('uploadValue').textContent = 'Misurando Upload...';
    const startUpload = performance.now();
    const maxUploadSpeed = await measureUploadSpeed(testDuration, startUpload, updateUI);
    document.getElementById('uploadValue').textContent = maxUploadSpeed.toFixed(2);

    progressBar.style.display = 'none';
    startTestButton.disabled = false;
}

document.getElementById('startTest').addEventListener('click', runTests);

window.onload = getIPAddress;
